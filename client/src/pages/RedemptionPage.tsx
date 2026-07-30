import {
  Button,
  Card,
  Descriptions,
  Empty,
  Modal,
  Space,
  Spin,
  Table,
  Tag,
  message,
} from 'antd'
import { useCallback, useEffect, useState } from 'react'
import { api, formatDate, formatMoney, todayString } from '../api'
import type { Client, Pledge, RedemptionQuote } from '../api'
import { ClientSelect } from '../components/ClientSelect'

export function RedemptionPage() {
  const [client, setClient] = useState<Client>()
  const [pledges, setPledges] = useState<Pledge[]>([])
  const [loading, setLoading] = useState(false)
  const [quote, setQuote] = useState<RedemptionQuote>()
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [redeeming, setRedeeming] = useState(false)

  const reload = useCallback(async (clientId: number) => {
    setLoading(true)
    try {
      setPledges(await api.activePledges(clientId))
    } catch (e) {
      message.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (client) {
      reload(client.id)
    } else {
      setPledges([])
    }
  }, [client, reload])

  const openQuote = async (pledge: Pledge) => {
    setQuoteLoading(true)
    try {
      setQuote(await api.redemptionQuote(pledge.id))
    } catch (e) {
      message.error((e as Error).message)
    } finally {
      setQuoteLoading(false)
    }
  }

  const redeem = async () => {
    if (!quote) {
      return
    }
    setRedeeming(true)
    try {
      const redeemed = await api.redeem(quote.pledge.id)
      message.success(
        `Залог №${redeemed.id} выкуплен за ${formatMoney(redeemed.redemptionAmount ?? 0)}`,
      )
      setQuote(undefined)
      if (client) {
        reload(client.id)
      }
    } catch (e) {
      message.error((e as Error).message)
    } finally {
      setRedeeming(false)
    }
  }

  return (
    <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
      <Card title="Клиент">
        <ClientSelect value={client?.id} onChange={setClient} />
      </Card>

      <Card title="Активные залоги">
        {!client ? (
          <Empty description="Выберите клиента" />
        ) : (
          <Table
            rowKey="id"
            loading={loading}
            pagination={false}
            locale={{ emptyText: 'Нет активных залогов' }}
            dataSource={pledges}
            columns={[
              { title: '№', dataIndex: 'id' },
              {
                title: 'Оформлен',
                dataIndex: 'createdAt',
                render: formatDate,
              },
              {
                title: 'До',
                dataIndex: 'dueDate',
                render: (date: string) => {
                  const overdue = date < todayString()
                  return (
                    <Space>
                      {formatDate(date)}
                      {overdue && <Tag color="red">просрочка</Tag>}
                    </Space>
                  )
                },
              },
              {
                title: 'Тариф',
                dataIndex: ['tariff', 'name'],
              },
              {
                title: 'Товары',
                dataIndex: 'items',
                render: (items: Pledge['items']) =>
                  (items ?? []).map((i) => i.name).join(', '),
              },
              {
                title: 'Сумма займа',
                dataIndex: 'loanAmount',
                align: 'right',
                render: (v: number) => formatMoney(v),
              },
              {
                title: '',
                render: (_, pledge) => (
                  <Button type="primary" onClick={() => openQuote(pledge)}>
                    Выкупить
                  </Button>
                ),
              },
            ]}
          />
        )}
      </Card>

      <Modal
        title={quote ? `Выкуп залога №${quote.pledge.id}` : 'Выкуп залога'}
        open={quoteLoading || !!quote}
        onCancel={() => setQuote(undefined)}
        footer={
          <Space>
            <Button onClick={() => setQuote(undefined)}>Отмена</Button>
            <Button type="primary" loading={redeeming} onClick={redeem}>
              Выкупить за {quote ? formatMoney(quote.total) : '…'}
            </Button>
          </Space>
        }
      >
        {quoteLoading || !quote ? (
          <Spin />
        ) : (
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="Сумма займа">
              {formatMoney(quote.loanAmount)}
            </Descriptions.Item>
            <Descriptions.Item label="Проценты за основной период">
              {formatMoney(quote.baseInterest)}
            </Descriptions.Item>
            <Descriptions.Item label="Дней просрочки">
              {quote.overdueDays}
            </Descriptions.Item>
            <Descriptions.Item label="Проценты за просрочку">
              {formatMoney(quote.overdueInterest)}
            </Descriptions.Item>
            <Descriptions.Item label="Итого к оплате">
              <b>{formatMoney(quote.total)}</b>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </Space>
  )
}
