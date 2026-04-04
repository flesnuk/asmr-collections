/* eslint-disable @eslint-react/no-array-index-key -- skeleton only */
import { Skeleton } from '~/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { useTranslation } from '~/lib/i18n';

export function StorageSkeleton() {
  const { t } = useTranslation();

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{t('存储设置')}</h2>
        <Skeleton className="w-24 h-9" />
      </div>
      <div className="border rounded-md">
        <Table className="**:data-[slot=table-head]:text-center">
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-15">ID</TableHead>
              <TableHead className="min-w-25">{t('名称')}</TableHead>
              <TableHead className="min-w-20">{t('优先级')}</TableHead>
              <TableHead className="min-w-30">{t('备注')}</TableHead>
              <TableHead className="min-w-45">{t('操作')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 3 }).map((_, index) => (
              <TableRow key={index}>
                {Array.from({ length: 4 }).map((_, index) => (
                  <TableCell key={index}>
                    <Skeleton className="w-full h-6" />
                  </TableCell>
                ))}
                <TableCell>
                  <div className="flex gap-2 justify-center">
                    <Skeleton className="w-16 h-9" />
                    <Skeleton className="w-16 h-9" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
