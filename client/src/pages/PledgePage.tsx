import {
  Button,
  Card,
  Descriptions,
  Divider,
  Empty,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Table,
  Typography,
  message,
} from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { api, formatDate, formatMoney } from '../api'
import type { Client, ItemCategory, NewPledgeItem, Tariff } from '../api'
import { ClientSelect } from '../components/ClientSelect'

function addDays(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function PledgePage() {
  const [tariffs, setTariffs] = useState<Tariff[]>([])
  const [categories, setCategories] = useState<ItemCategory[]>([])
  const [tariffId, setTariffId] = useState<number>()
  const [client, setClient] = useState<Client>()
  const [items, setItems] = useState<NewPledgeItem[]>([])
  const [saving, setSaving] = useState(false)
  const [itemForm] = Form.useForm()
  const categoryId = Form.useWatch('categoryId', itemForm)

  useEffect(() => {
    Promise.all([api.tariffs(), api.categories()])
      .then(([t, c]) => {
        setTariffs(t)
        setCategories(c)
      })
      .catch((e) => message.error((e as Error).message))
  }, [])

  const tariff = tariffs.find((t) => t.id === tariffId)
  const category = categories.find((c) => c.id === categoryId)
  const total = useMemo(
    () => items.reduce((sum, item) => sum + Math.round(item.amount * 100), 0) / 100,
    [items],
  )

  const addItem = async () => {
    const values = await itemForm.validateFields()
    const { categoryId, name, amount, ...attributes } = values
    setItems((prev) => [...prev, { categoryId, name, amount, attributes }])
    itemForm.resetFields()
  }

  const save = async () => {
    if (!tariff) {
      message.warning('Выберите тариф')
      return
    }
    if (!client) {
      message.warning('Выберите клиента')
      return
    }
    if (items.length === 0) {
      message.warning('Добавьте хотя бы один товар')
      return
    }
    setSaving(true)
    try {
      const pledge = await api.createPledge({
        tariffId: tariff.id,
        clientId: client.id,
        items,
      })
      message.success(
        `Залог №${pledge.id} оформлен на сумму ${formatMoney(pledge.loanAmount)}, до ${formatDate(pledge.dueDate)}`,
      )
      setItems([])
      setTariffId(undefined)
      setClient(undefined)
    } catch (e) {
      message.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
      <Card title="Условия">
        <Space orientation="vertical" style={{ width: '100%' }}>
          <Select
            style={{ width: '100%' }}
            placeholder="Тариф"
            value={tariffId}
            onChange={setTariffId}
            options={tariffs.map((t) => ({ value: t.id, label: t.name }))}
          />
          {tariff && (
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Основной период">
                {tariff.basePeriodDays} дн.
              </Descriptions.Item>
              <Descriptions.Item label="Процент за период">
                {tariff.basePeriodRate}%
              </Descriptions.Item>
              <Descriptions.Item label="Дата «до»">
                {formatDate(addDays(tariff.basePeriodDays))}
              </Descriptions.Item>
              <Descriptions.Item label="Просрочка">
                {tariff.overdueRate}% в день
                {tariff.overduePeriodDays
                  ? `, до ${tariff.overduePeriodDays} дн.`
                  : ''}
              </Descriptions.Item>
            </Descriptions>
          )}
        </Space>
      </Card>

      <Card title="Клиент">
        <ClientSelect value={client?.id} onChange={setClient} />
      </Card>

      <Card title="Товары">
        <Form form={itemForm} layout="vertical" style={{ maxWidth: 480 }}>
          <Form.Item
            name="categoryId"
            label="Группа товара"
            rules={[{ required: true, message: 'Выберите группу' }]}
          >
            <Select
              placeholder="Группа"
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
              onChange={() => {
                const keep = itemForm.getFieldValue('categoryId')
                itemForm.resetFields()
                itemForm.setFieldValue('categoryId', keep)
              }}
            />
          </Form.Item>
          {category && (
            <>
              <Form.Item
                name="name"
                label="Название"
                rules={[{ required: true, message: 'Укажите название' }]}
              >
                <Input placeholder="Например, iPhone 13" />
              </Form.Item>
              {category.fields.map((field) => (
                <Form.Item
                  key={field.key}
                  name={field.key}
                  label={field.label}
                  rules={
                    field.required
                      ? [{ required: true, message: 'Обязательное поле' }]
                      : []
                  }
                >
                  {field.type === 'select' ? (
                    <Select
                      options={(field.options ?? []).map((o) => ({
                        value: o,
                        label: o,
                      }))}
                    />
                  ) : field.type === 'number' ? (
                    <InputNumber style={{ width: '100%' }} min={0} />
                  ) : (
                    <Input />
                  )}
                </Form.Item>
              ))}
              <Form.Item
                name="amount"
                label="Оценочная стоимость, ₽"
                rules={[{ required: true, message: 'Укажите сумму' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0.01}
                  precision={2}
                  decimalSeparator=","
                />
              </Form.Item>
              <Button type="dashed" onClick={addItem} block>
                Добавить товар
              </Button>
            </>
          )}
        </Form>

        <Divider />

        {items.length === 0 ? (
          <Empty description="Товары ещё не добавлены" />
        ) : (
          <Table
            rowKey={(_, index) => index!}
            pagination={false}
            size="small"
            dataSource={items}
            columns={[
              {
                title: 'Группа',
                dataIndex: 'categoryId',
                render: (id: number) =>
                  categories.find((c) => c.id === id)?.name,
              },
              { title: 'Название', dataIndex: 'name' },
              {
                title: 'Характеристики',
                dataIndex: 'attributes',
                render: (attrs: Record<string, string | number>) =>
                  Object.values(attrs).filter(Boolean).join(', '),
              },
              {
                title: 'Стоимость',
                dataIndex: 'amount',
                align: 'right',
                render: (v: number) => formatMoney(v),
              },
              {
                title: '',
                render: (_, __, index) => (
                  <Button
                    size="small"
                    danger
                    type="link"
                    onClick={() =>
                      setItems((prev) => prev.filter((_, i) => i !== index))
                    }
                  >
                    Убрать
                  </Button>
                ),
              },
            ]}
          />
        )}
      </Card>

      <Card>
        <Space
          style={{ width: '100%', justifyContent: 'space-between' }}
          align="center"
        >
          <Typography.Title level={5} style={{ margin: 0 }}>
            Сумма займа: {formatMoney(total)}
          </Typography.Title>
          <Button type="primary" size="large" loading={saving} onClick={save}>
            Оформить залог
          </Button>
        </Space>
      </Card>
    </Space>
  )
}
