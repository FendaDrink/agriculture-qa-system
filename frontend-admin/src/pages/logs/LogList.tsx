import { useMemo, useState } from 'react'
import {
  Button,
  DatePicker,
  Descriptions,
  Drawer,
  Input,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import PageHeader from '../../components/PageHeader'
import type { RequestLogDetail, RequestLogListItem } from '../../api/logs'
import { getLogDetail, getLogs, getLogsMetrics } from '../../api/logs'

const { RangePicker } = DatePicker

const sourceOptions = [
  { label: '全部来源', value: '' },
  { label: '业务后端', value: 'backend' },
  { label: '算法服务', value: 'algorithm' },
]

const clientOptions = [
  { label: '全部客户端', value: '' },
  { label: '管理后台(admin)', value: 'admin' },
  { label: '用户前台(frontend)', value: 'frontend' },
  { label: '后端调用(backend)', value: 'backend' },
]

const methodOptions = [
  { label: '全部方法', value: '' },
  { label: 'GET', value: 'GET' },
  { label: 'POST', value: 'POST' },
  { label: 'PATCH', value: 'PATCH' },
  { label: 'DELETE', value: 'DELETE' },
]

const renderStatusTag = (code: number) => {
  if (code >= 400) return <Tag color="red">{code}</Tag>
  if (code >= 300) return <Tag color="gold">{code}</Tag>
  return <Tag color="green">{code}</Tag>
}

const formatJson = (raw?: string | null) => {
  if (!raw) return '-'
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch (error) {
    return raw
  }
}

const LogList: React.FC = () => {
  const queryClient = useQueryClient()

  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().startOf('day'), dayjs().endOf('day')])
  const [source, setSource] = useState('')
  const [clientApp, setClientApp] = useState('')
  const [method, setMethod] = useState('')
  const [keyword, setKeyword] = useState('')
  const [userId, setUserId] = useState('')
  const [statusCode, setStatusCode] = useState<number | undefined>(undefined)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedId, setSelectedId] = useState('')

  const params = useMemo(() => {
    return {
      page,
      pageSize,
      startTime: range[0].toISOString(),
      endTime: range[1].toISOString(),
      source: source || undefined,
      clientApp: clientApp || undefined,
      method: method || undefined,
      keyword: keyword || undefined,
      userId: userId || undefined,
      statusCode: statusCode,
    }
  }, [page, pageSize, range, source, clientApp, method, keyword, userId, statusCode])

  const { data: listData, isLoading } = useQuery({
    queryKey: ['logs', params],
    queryFn: () => getLogs(params),
  })

  const { data: metricsData, isLoading: metricsLoading } = useQuery({
    queryKey: ['logs-metrics', range[0].toISOString(), range[1].toISOString(), source, clientApp],
    queryFn: () =>
      getLogsMetrics({
        startTime: range[0].toISOString(),
        endTime: range[1].toISOString(),
        source: source || undefined,
        clientApp: clientApp || undefined,
      }),
  })

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['log-detail', selectedId],
    queryFn: () => getLogDetail(selectedId),
    enabled: detailOpen && !!selectedId,
  })

  const columns = [
    {
      title: '时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 170,
      render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      width: 100,
      render: (value: string) => (value === 'algorithm' ? <Tag color="blue">算法</Tag> : <Tag color="green">后端</Tag>),
    },
    {
      title: '客户端',
      dataIndex: 'clientApp',
      key: 'clientApp',
      width: 130,
      render: (value: string | null | undefined) => value || <span className="muted">-</span>,
    },
    {
      title: '方法',
      dataIndex: 'method',
      key: 'method',
      width: 90,
      render: (value: string) => <Tag bordered={false}>{value}</Tag>,
    },
    {
      title: '路径',
      dataIndex: 'path',
      key: 'path',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'statusCode',
      key: 'statusCode',
      width: 90,
      render: (value: number) => renderStatusTag(value),
    },
    {
      title: '耗时',
      dataIndex: 'durationMs',
      key: 'durationMs',
      width: 100,
      render: (value: number) => `${value} ms`,
    },
    {
      title: '用户',
      dataIndex: 'userId',
      key: 'userId',
      width: 120,
      render: (value: string | null | undefined) => value || <span className="muted">-</span>,
    },
  ]

  const list = listData?.items || []

  const openDetail = (record: RequestLogListItem) => {
    setSelectedId(record.id)
    setDetailOpen(true)
  }

  return (
    <div>
      <PageHeader
        title="日志审计"
        subtitle="记录前台、后台与算法服务的 API 请求"
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['logs'] })
              queryClient.invalidateQueries({ queryKey: ['logs-metrics'] })
            }}
          >
            刷新
          </Button>
        }
      />

      <Space wrap style={{ marginBottom: 12 }}>
        <RangePicker
          showTime
          value={range}
          onChange={(value) => {
            if (!value || !value[0] || !value[1]) return
            setRange([value[0], value[1]])
            setPage(1)
          }}
        />
        <Select
          style={{ width: 150 }}
          options={sourceOptions}
          value={source}
          onChange={(value) => {
            setSource(value)
            setPage(1)
          }}
        />
        <Select
          style={{ width: 180 }}
          options={clientOptions}
          value={clientApp}
          onChange={(value) => {
            setClientApp(value)
            setPage(1)
          }}
        />
        <Select
          style={{ width: 120 }}
          options={methodOptions}
          value={method}
          onChange={(value) => {
            setMethod(value)
            setPage(1)
          }}
        />
        <Input
          placeholder="关键词(路径/错误)"
          style={{ width: 220 }}
          allowClear
          value={keyword}
          onChange={(e) => {
            setKeyword(e.target.value)
            setPage(1)
          }}
        />
        <Input
          placeholder="用户ID"
          style={{ width: 180 }}
          allowClear
          value={userId}
          onChange={(e) => {
            setUserId(e.target.value)
            setPage(1)
          }}
        />
        <Input
          placeholder="状态码"
          style={{ width: 100 }}
          allowClear
          value={statusCode === undefined ? '' : String(statusCode)}
          onChange={(e) => {
            const value = e.target.value.trim()
            if (!value) {
              setStatusCode(undefined)
              setPage(1)
              return
            }
            const code = Number(value)
            if (!Number.isFinite(code)) return
            setStatusCode(code)
            setPage(1)
          }}
        />
      </Space>

      <Space wrap style={{ marginBottom: 12 }}>
        <Statistic title="请求数" value={metricsData?.total ?? 0} loading={metricsLoading} />
        <Statistic title="错误数" value={metricsData?.error ?? 0} loading={metricsLoading} />
        <Statistic title="错误率" value={`${((metricsData?.errorRate ?? 0) * 100).toFixed(2)}%`} loading={metricsLoading} />
        <Statistic title="平均耗时" value={`${metricsData?.avgDurationMs ?? 0} ms`} loading={metricsLoading} />
        <Statistic title="P95耗时" value={`${metricsData?.p95DurationMs ?? 0} ms`} loading={metricsLoading} />
      </Space>

      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={list}
        columns={columns as any}
        size="middle"
        pagination={{
          current: page,
          pageSize,
          total: listData?.total || 0,
          showSizeChanger: true,
          onChange: (nextPage, nextPageSize) => {
            setPage(nextPage)
            setPageSize(nextPageSize)
          },
        }}
        onRow={(record) => {
          return {
            onClick: () => openDetail(record),
            style: { cursor: 'pointer' },
          }
        }}
      />

      <Drawer
        title="日志详情"
        width={960}
        placement="right"
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false)
          setSelectedId('')
        }}
        destroyOnClose
      >
        {detailLoading ? (
          <Typography.Text className="muted">加载中...</Typography.Text>
        ) : detailData ? (
          <div>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 12 }}>
              <Descriptions.Item label="时间">{dayjs(detailData.createTime).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
              <Descriptions.Item label="来源">{detailData.source}</Descriptions.Item>
              <Descriptions.Item label="客户端">{detailData.clientApp || '-'}</Descriptions.Item>
              <Descriptions.Item label="请求ID">{detailData.requestId || '-'}</Descriptions.Item>
              <Descriptions.Item label="方法">{detailData.method}</Descriptions.Item>
              <Descriptions.Item label="状态">{renderStatusTag(detailData.statusCode)}</Descriptions.Item>
              <Descriptions.Item label="耗时">{detailData.durationMs} ms</Descriptions.Item>
              <Descriptions.Item label="用户">{detailData.userId || '-'}</Descriptions.Item>
              <Descriptions.Item label="IP">{detailData.ip || '-'}</Descriptions.Item>
              <Descriptions.Item label="路径" span={2}>
                <Typography.Text code>{detailData.originalUrl}</Typography.Text>
              </Descriptions.Item>
              {detailData.errorMessage ? (
                <Descriptions.Item label="错误信息" span={2}>
                  <Typography.Text type="danger">{detailData.errorMessage}</Typography.Text>
                </Descriptions.Item>
              ) : null}
            </Descriptions>

            <Typography.Title level={5} style={{ marginTop: 0 }}>
              Headers
            </Typography.Title>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{formatJson(detailData.headers)}</pre>

            <Typography.Title level={5}>Query</Typography.Title>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{formatJson(detailData.query)}</pre>

            <Typography.Title level={5}>Body</Typography.Title>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{formatJson(detailData.body)}</pre>

            {detailData.errorStack ? (
              <>
                <Typography.Title level={5}>Stack</Typography.Title>
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{detailData.errorStack}</pre>
              </>
            ) : null}
          </div>
        ) : (
          <Typography.Text className="muted">暂无详情</Typography.Text>
        )}
      </Drawer>
    </div>
  )
}

export default LogList

