export default {
  // batch/create
  '未提供任何 ID，结束操作': 'No IDs provided, ending operation',
  '请提供 ID': 'Please provide IDs',
  '已有批量任务正在进行中，请稍后再试': 'A batch task is already in progress, please try again later',
  '正在进行操作，请稍后再试': 'Operation in progress, please try again later',
  '服务器正在处理另一个批量操作': 'The server is processing another batch operation',
  '开始处理 {total} 个作品，分批进行': 'Starting to process {total} works in batches',
  '准备完成，共 {total} 个作品，将分为 {batches} 批处理': 'Ready, {total} works total, will be processed in {batches} batches',
  '开始处理第 {batchIndex} 批，包含 {count} 个作品': 'Processing batch {batchIndex} with {count} works',
  '作品已收藏': 'Work already in favorites',
  '作品 {id} 已收藏，跳过': 'Work {id} already in favorites, skipping',
  '本批次需抓取 {count} 个新作品，{skip} 个已跳过': 'Batch needs to fetch {count} new works, {skip} skipped',
  '本批次无有效数据，跳过': 'No valid data in this batch, skipping',
  '信息获取阶段完成：成功 {success} 个，失败 {failed} 个，开始更新入库阶段': 'Info fetch complete: {success} succeeded, {failed} failed, starting database update',
  '批次关联数据部分失败，请查看服务端日志': 'Some relation data in this batch failed, check server logs',
  '生成向量失败': 'Failed to generate embedding',
  '封面保存失败': 'Cover image save failed',
  '创建成功': 'Created successfully',
  '创建失败': 'Creation failed',
  '第 {batchIndex} 批：成功 {success} 个，失败 {failed} 个': 'Batch {batchIndex}: {success} succeeded, {failed} failed',
  '所有批次处理完成：成功: {success}，失败：{failed}': 'All batches complete: {success} succeeded, {failed} failed',
  '批量创建完成': 'Batch creation complete',
  '批量创建失败：{message}': 'Batch creation failed: {message}',
  '批量创建失败': 'Batch creation failed',

  // batch/update
  '没有需要更新的作品，结束操作': 'No works to update, ending operation',
  '没有需要更新的作品': 'No works to update',
  '所有批次处理完成：成功: {success}, 失败: {failed}': 'All batches complete: {success} succeeded, {failed} failed',
  '批量更新完成': 'Batch update complete',
  '更新成功': 'Updated successfully',
  '更新失败': 'Update failed',
  '批量更新失败: {message}': 'Batch update failed: {message}',
  '批量更新失败': 'Batch update failed',

  // create
  '{id} 生成向量失败': '{id} : Failed to generate embedding',
  '保存 cover 图片失败': 'Failed to save cover image',

  // update
  '收藏不存在': 'Favorite does not exist',
  '向量更新成功': 'Vector updated successfully',

  // fetchValidData
  'DLsite 不存在此作品': 'Work does not exist on DLsite',
  'DLsite 不存在 {id}，跳过更新': 'Work {id} does not exist on DLsite, skipping',
  '信息获取成功': 'Info fetched successfully',
  '获取 {id} 信息失败': 'Failed to fetch info for {id}',
  '网络或解析错误': 'Network or parsing error',
  '信息获取队列出错：{message}': 'Info fetch queue error: {message}',

  // errors
  '未知错误': 'Unknown error',
} as Record<string, string>;
