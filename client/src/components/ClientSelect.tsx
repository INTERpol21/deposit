import { Button, Form, Input, Modal, Select, Space, message } from 'antd'
import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import type { Client } from '../api'

interface Props {
  value?: number
  onChange: (client: Client | undefined) => void
}

export function ClientSelect({ value, onChange }: Props) {
  const [options, setOptions] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const load = async (search: string) => {
    setLoading(true)
    try {
      setOptions(await api.searchClients(search))
    } catch (e) {
      message.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load('')
  }, [])

  const onSearch = (search: string) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => load(search), 300)
  }

  const createClient = async () => {
    const values = await form.validateFields()
    try {
      const client = await api.createClient(values)
      setOptions((prev) => [client, ...prev])
      onChange(client)
      setModalOpen(false)
      form.resetFields()
      message.success('Клиент создан')
    } catch (e) {
      message.error((e as Error).message)
    }
  }

  return (
    <>
      <Space.Compact style={{ width: '100%' }}>
        <Select
          style={{ width: '100%' }}
          showSearch
          allowClear
          value={value}
          placeholder="Поиск по ФИО, телефону или паспорту"
          filterOption={false}
          onSearch={onSearch}
          onChange={(id) => onChange(options.find((c) => c.id === id))}
          loading={loading}
          notFoundContent="Никого не нашли"
          options={options.map((c) => ({
            value: c.id,
            label: `${c.fullName} · ${c.phone}`,
          }))}
        />
        <Button onClick={() => setModalOpen(true)}>Новый клиент</Button>
      </Space.Compact>
      <Modal
        title="Новый клиент"
        open={modalOpen}
        onOk={createClient}
        onCancel={() => setModalOpen(false)}
        okText="Создать"
        cancelText="Отмена"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="fullName"
            label="ФИО"
            rules={[{ required: true, message: 'Укажите ФИО' }]}
          >
            <Input placeholder="Иванов Иван Иванович" />
          </Form.Item>
          <Form.Item
            name="phone"
            label="Телефон"
            rules={[{ required: true, message: 'Укажите телефон' }]}
          >
            <Input placeholder="+7 900 000-00-00" />
          </Form.Item>
          <Form.Item name="passport" label="Паспорт">
            <Input placeholder="0000 000000" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
