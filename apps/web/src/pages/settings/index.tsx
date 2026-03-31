import { Suspense } from 'react';
import { motion } from 'framer-motion';
import { useImmerAtom, useSetImmerAtom } from 'jotai-immer';
import { createLazyRoute } from '@tanstack/react-router';

import { settingOptionsAtom } from '~/hooks/use-setting-options';
import { transcodeTempAtom } from '~/hooks/use-transcode-options';

import { Link } from '~/components/link';

import { Separator } from '~/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';

import { useTranslation } from '~/lib/i18n';
import type { Language } from '~/hooks/use-setting-options';

import { GenresSettings } from './components/genres';
import { StorageSettings } from './components/storage';
import { SettingItem } from './components/setting-item';
import { TranscodeSettings } from './components/transcode';
import { StorageSkeleton } from './components/storage-skeleton';
import { ASMRONEAPISettings } from './components/asmr-one-server';
import { SmartPathSettings } from './components/smart-path-settings';
import { ASMRONEQualitySettings } from './components/asmr-one-quality';

const URLS = [
  { name: 'ASMR.ONE', url: 'https://asmr.one' },
  { name: 'GitHub', url: 'https://github.com/kahosan/asmr-collections' },
  { name: 'DLsite', url: 'https://dlsite.com' }
];

function Settings() {
  const [options, setOptions] = useImmerAtom(settingOptionsAtom);
  const setTranscodeTemp = useSetImmerAtom(transcodeTempAtom);
  const { t } = useTranslation();

  const storage = options.storage;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-4.5 max-w-2xl mx-auto mt-4 px-4 pb-8"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">{t('Language')}</h3>
        </div>
        <Select
          value={options.language || 'zh'}
          onValueChange={val => setOptions(d => { d.language = val as Language; })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="zh">简体中文</SelectItem>
            <SelectItem value="ja">日本語</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      <SettingItem
        id="use-asmr-one-recommender"
        description={t('详情页的相似作品替换为 ASMR.ONE 的推荐')}
        checked={options.asmrone.recommender}
        onCheckedChange={checked => setOptions(d => {
          d.asmrone.recommender = checked;
        })}
      >
        {t('使用 ASMR.ONE 的推荐')}
      </SettingItem>

      <SettingItem
        id="priority-asmr-one-library"
        description={t('开启本地库时也优先使用 ASMR.ONE 音声库，不存在时回退至本地库')}
        checked={options.asmrone.priority}
        onCheckedChange={checked => setOptions(d => {
          d.asmrone.priority = checked;
        })}
      >
        {t('优先使用 ASMR.ONE 音声库')}
      </SettingItem>

      <ASMRONEQualitySettings
        value={options.asmrone.quality}
        onChange={value => setOptions(d => {
          d.asmrone.quality = value;
        })}
      />

      <ASMRONEAPISettings
        value={options.asmrone.api}
        onChange={value => setOptions(d => {
          d.asmrone.api = value;
        })}
      />

      <Separator />

      <GenresSettings api={options.asmrone.api} />

      <SettingItem
        id="show-work-details"
        checked={options.showWorkDetail}
        onCheckedChange={checked => setOptions(d => {
          d.showWorkDetail = checked;
        })}
      >
        {t('作品详情页显示详细信息')}
      </SettingItem>

      <SmartPathSettings
        options={options.smartPath}
        setOptions={(key, value) => setOptions(d => {
          d.smartPath[key] = value;
        })}
      />

      <Separator />

      <SettingItem
        id="storage-enabled"
        checked={storage.enabled}
        onCheckedChange={checked => {
          setOptions(d => {
            d.storage.enabled = checked;
            if (!checked) {
              d.storage.showMissingTags = false;
              d.storage.transcode.enabled = false;
              setTranscodeTemp(d => { d.enabled = false; });
            }
          });
        }}
      >
        {t('使用本地音声库')}
      </SettingItem>

      <SettingItem
        id="storage-show-missing-tags"
        checked={storage.showMissingTags}
        onCheckedChange={checked => setOptions(d => {
          d.storage.showMissingTags = checked;
        })}
        disabled={!storage.enabled}
      >
        {t('当启用本地库时显示不存在于本地库的标签')}
      </SettingItem>

      <SettingItem
        id="storage-fallback-to-asmr-one-api"
        checked={storage.fallbackToAsmrOneApi}
        onCheckedChange={checked => setOptions(d => {
          d.storage.fallbackToAsmrOneApi = checked;
        })}
        disabled={!storage.enabled}
      >
        {t('无法在本地库中找到音声时使用 ASMR.ONE')}
      </SettingItem>

      <TranscodeSettings disabled={!storage.enabled} />

      <Separator />

      <Suspense fallback={<StorageSkeleton />}>
        <StorageSettings />
      </Suspense>

      <Separator />

      <div className="flex gap-2">
        {URLS.map(({ name, url }) => (
          <Link title={name} key={name} to={url} isExternal underline="hover" className="text-sm">
            {name}
          </Link>
        ))}
      </div>
    </motion.div>
  );
}

const Route = createLazyRoute('/settings')({
  component: Settings
});

export default Route;
