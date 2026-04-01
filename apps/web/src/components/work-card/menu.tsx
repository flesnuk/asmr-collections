import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { confirm } from '../ui/confirmer';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuPortal, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from '../ui/dropdown-menu';

import { Link } from '../link';
import { Loading } from '../loading';
import { PlaylistDialog } from '~/pages/playlists/components/playlist-dialog';

import { ChevronLeftIcon, ChevronRightIcon, MenuIcon, PlusIcon } from 'lucide-react';

import { extname, formatISODate, withQuery } from '@asmr-collections/shared';

import useSWR from 'swr';
import { toast } from 'sonner';
import { memo, useState } from 'react';

import { useToastMutation } from '~/hooks/use-toast-fetch';

import { externalUrl } from '~/utils';
import { mutatePlaylist, mutateWorkInfo, mutateWorks } from '~/lib/mutation';

import { fetcher } from '~/lib/fetcher';

import type { Work, PlaylistsResponse } from '@asmr-collections/shared';
import { useTranslation } from '~/lib/i18n';

interface Props {
  work: Work
}

export const Menu = memo(({ work }: Props) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const [updateAction, updateIsMutating] = useToastMutation('update');

  const handleUpdate = () => {
    updateAction({
      key: `/api/work/update/${work.id}`,
      fetchOps: { method: 'PUT' },
      toastOps: {
        loading: `${work.id} ${t('数据更新中')}...`,
        success: `${work.id} ${t('数据更新成功')}`,
        error: `${work.id} ${t('数据更新失败')}`,
        finally() {
          setOpen(false);
          mutateWorks();
        }
      }
    });
  };

  const [deleteAction, deleteIsMutating] = useToastMutation('delete');

  const handleDelete = async () => {
    const yes = await confirm({
      title: t('确定要删除收藏吗?'),
      description: t('认真考虑哦')
    });
    if (!yes) return;

    deleteAction({
      key: `/api/work/delete/${work.id}`,
      fetchOps: { method: 'DELETE' },
      toastOps: {
        loading: `${work.id} ${t('删除中...')}...`,
        success: `${work.id} ${t('删除成功')}`,
        error: `${work.id} ${t('删除失败')}`,
        finally() {
          setOpen(false);
          mutateWorks();
        }
      }
    });
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          onPointerDown={e => e.preventDefault()}
          onClick={() => setOpen(p => !p)}
          size="lg"
          variant="outline"
          className="w-16"
        >
          <MenuIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 max-[400px]:w-40" onInteractOutside={() => setOpen(false)}>
        <DropdownMenuLabel>
          {t('作品菜单')}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem disabled={updateIsMutating} onClick={handleUpdate}>
            {t('数据更新')}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteIsMutating}
          >
            {t('删除收藏')}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <SubtitlesSubMenu id={work.id} existsSubtitles={work.subtitles} onClose={() => setOpen(false)} />
        <PlaylistSubMenu workId={work.id} />
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>{t('作品详情')}</DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuItem>
                  {t('售价')}：{work.price}
                  <sup className="font-bold">(JPY)</sup>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  {t('评分')}：{work.rate}
                  <sup className="font-bold">({work.rateCount})</sup>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  {t('销量')}：{work.sales}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  {t('收藏数')}：{work.wishlistCount}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  {t('赏析数')}：{work.reviewCount}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  {t('发售日期')}：{formatISODate(work.releaseDate)}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  {t('收藏日期')}：{formatISODate(work.createdAt)}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  {t('更新日期')}：{formatISODate(work.updatedAt)}
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>{t('语言版本')}</DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                {work.languageEditions.length === 0 && <DropdownMenuItem>{t('没有其它版本')}</DropdownMenuItem>}
                {work.languageEditions.map(languageEdition => (
                  <DropdownMenuItem asChild key={languageEdition.workId}>
                    <Link to={externalUrl.dlsite(languageEdition.workId)} isExternal showAnchorIcon>
                      {languageEdition.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {[
            { label: 'DLsite', link: `https://www.dlsite.com/maniax/work/=/product_id/${work.id}.html` },
            { label: 'One', link: `https://asmr.one/work/${work.id}` }
          ]
            .map(({ label, link }) => (
              <DropdownMenuItem asChild key={label}>
                <Link to={link} isExternal showAnchorIcon>
                  {label}
                </Link>
              </DropdownMenuItem>
            ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

export function SubtitlesSubMenu({ id, existsSubtitles, onClose }: { id: string, existsSubtitles: boolean, onClose?: () => void }) {
  const { t } = useTranslation();
  const [subtitlesAction, subtitlesIsMutating] = useToastMutation('subtitles');

  const handleUpload = async (subtitles?: FileList | null) => {
    if (!subtitles || subtitles.length === 0) {
      toast.error(t('请选择字幕文件'));
      return;
    }
    const formdata = new FormData();

    const file = subtitles[0];

    const fileExt = extname(file.name);
    const fileSize = file.size;

    if (!['zip'].includes(fileExt) || fileSize > 2 * 1024 * 1024) {
      toast.error(
        <div>
          <p>{t('文件格式仅支持')} <code>zip</code></p>
          <p>{t('并且大小不超过')} <code>2MB</code></p>
        </div>
      );
      return;
    }

    formdata.append('subtitles', file);

    if (existsSubtitles) {
      const yes = await confirm({
        title: t('可能已存在字幕，确定要覆盖吗?'),
        description: t('覆盖后不可恢复')
      });
      if (!yes) return;
    }

    subtitlesAction({
      key: `/api/subtitles/${id}`,
      fetchOps: {
        method: 'PUT',
        body: formdata
      },
      toastOps: {
        loading: `${id} ${t('字幕上传中...')}`,
        success() {
          // 重新请求字幕信息
          mutateWorkInfo(id);
          return `${id} ${t('字幕上传成功')}`;
        },
        error: `${id} ${t('字幕上传失败')}`,
        description: `${t('上传的字幕名称为:')} ${file.name}`
      }
    });

    onClose?.();
  };

  const handleDownload = () => {
    if (!existsSubtitles)
      return toast.error(t('字幕不存在'));

    window.open(withQuery(`/api/subtitles/${id}`, { action: 'download' }));
  };

  const handleDelete = async () => {
    if (!existsSubtitles)
      return toast.error(t('字幕不存在'));

    const yes = await confirm({
      title: t('确定要删除字幕吗?'),
      description: t('认真考虑哦')
    });

    if (!yes) return;

    subtitlesAction({
      key: `/api/subtitles/${id}`,
      fetchOps: {
        method: 'DELETE'
      },
      toastOps: {
        loading: `${id} ${t('字幕删除中...')}`,
        success() {
          mutateWorkInfo(id);
          return `${id} ${t('字幕删除成功')}`;
        },
        error: `${id} ${t('字幕删除失败')}`
      }
    });
  };

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>{t('字幕')}</DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent>
          <DropdownMenuItem onSelect={e => e.preventDefault()} disabled={subtitlesIsMutating}>
            <input
              type="file"
              id="subtitles-file-upload"
              className="hidden"
              onChange={e => handleUpload(e.target.files)}
            />
            <Label htmlFor="subtitles-file-upload" className="leading-5 w-full">
              {t('上传字幕')}
            </Label>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDownload} disabled={subtitlesIsMutating}>
            {t('下载字幕')}
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={handleDelete} disabled={subtitlesIsMutating}>
            {t('删除字幕')}
          </DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  );
}

export function PlaylistSubMenu({ workId }: { workId: string }) {
  const { t } = useTranslation();
  const [pagination, setPagination] = useState({ page: 1, limit: 8 });

  const swrKey = withQuery('/api/playlist', {
    page: pagination.page,
    limit: pagination.limit
  });

  const { data, isLoading, error } = useSWR<PlaylistsResponse>(swrKey, fetcher);

  const [addToPlaylistAction, addToPlaylistIsMutating] = useToastMutation('playlist-add');
  const [deleteFromPlaylistAction, deleteFromPlaylistIsMutating] = useToastMutation('playlist-delete');

  const totalPages = Math.max(1, Math.ceil(data?.total ? data.total / pagination.limit : 0));
  const canPrev = pagination.page > 1;
  const canNext = pagination.page < totalPages;

  const handlePrevPage = () => {
    if (!canPrev)
      return;

    setPagination(prev => ({ ...prev, page: prev.page - 1 }));
  };

  const handleNextPage = () => {
    if (!canNext)
      return;

    setPagination(prev => ({ ...prev, page: prev.page + 1 }));
  };

  const handleAddToPlaylist = (playlistId: string) => {
    addToPlaylistAction({
      key: `/api/playlist/${playlistId}/works/${workId}`,
      fetchOps: { method: 'PUT' },
      toastOps: {
        loading: t('添加到播放列表中...'),
        success: t('添加成功'),
        error: t('添加失败'),
        finally() {
          mutatePlaylist(playlistId);
        }
      }
    });
  };

  const handleDeleteFromPlaylist = (playlistId: string) => {
    deleteFromPlaylistAction({
      key: `/api/playlist/${playlistId}/works/${workId}`,
      fetchOps: { method: 'DELETE' },
      toastOps: {
        loading: t('从播放列表中移除中...'),
        success: t('移除成功'),
        error: t('移除失败'),
        finally() {
          mutatePlaylist(playlistId);
        }
      }
    });
  };

  const onCheckedChange = (playlistId: string, checked: boolean) => {
    if (checked)
      handleAddToPlaylist(playlistId);
    else
      handleDeleteFromPlaylist(playlistId);
  };

  if (isLoading || !data || error) {
    return (
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>{t('播放列表')}</DropdownMenuSubTrigger>
        <DropdownMenuPortal>
          <DropdownMenuSubContent className="flex justify-center h-14 items-center">
            <Loading isLoading={isLoading} />
            {error && <DropdownMenuItem disabled>{t('加载失败')}</DropdownMenuItem>}
          </DropdownMenuSubContent>
        </DropdownMenuPortal>
      </DropdownMenuSub>
    );
  }

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>{t('播放列表')}</DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent>
          {data.data.map(playlist => (
            <DropdownMenuCheckboxItem
              key={playlist.id}
              checked={playlist.works.some(w => w.id === workId)}
              onCheckedChange={checked => onCheckedChange(playlist.id, checked)}
              disabled={addToPlaylistIsMutating || deleteFromPlaylistIsMutating}
              className="max-w-32"
            >
              <span className="min-w-0 wrap-break-word line-clamp-2">
                {playlist.name}
              </span>
            </DropdownMenuCheckboxItem>
          ))}
          {data.data.length === 0 && (
            <DropdownMenuItem disabled>
              {t('暂无播放列表')}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <div className="text-sm flex justify-between items-center gap-2">
            <Button size="icon-sm" variant="ghost" onClick={handlePrevPage} disabled={!canPrev}><ChevronLeftIcon className="size-5 shrink-0" /></Button>
            <span>{pagination.page}/{totalPages}</span>
            <Button size="icon-sm" variant="ghost" onClick={handleNextPage} disabled={!canNext}><ChevronRightIcon className="size-5 shrink-0" /></Button>
          </div>
          <DropdownMenuSeparator />
          <PlaylistDialog
            type="create"
            trigger={
              <DropdownMenuItem className="justify-center" onSelect={e => e.preventDefault()}>
                <PlusIcon className="size-5 shrink-0" />
                {t('创建播放列表')}
              </DropdownMenuItem>
            }
          />
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  );
}
