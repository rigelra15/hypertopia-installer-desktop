import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@iconify/react', () => ({ Icon: () => null }))
vi.mock('../src/renderer/src/components/AuthHelpModal', () => ({ AuthHelpModal: () => null }))
vi.mock('../src/renderer/src/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key) =>
      ({
        device_scan_failed: 'ADB could not scan connected devices.',
        device_scan_details: 'ADB error details',
        device_not_detected_title: 'Quest not detected',
        device_help_usb: 'Use a data-capable USB cable.',
        device_help_unlock: 'Unlock the headset and allow USB debugging.',
        device_help_developer_mode: 'Enable Developer Mode.',
        device_retry_scan: 'Scan again',
        no_device: 'No Device',
        select_device: 'Select Device'
      })[key] || key
  })
}))

import { DeviceSelector } from '../src/renderer/src/components/DeviceSelector'

const connectedDevice = {
  serial: 'quest-123',
  state: 'device',
  model: 'Meta Quest 3',
  battery: '80%',
  isCharging: false,
  storage: { free: '10GB', total: '100GB', percent: '10%' }
}

describe('DeviceSelector connection diagnostics', () => {
  beforeEach(() => {
    window.api = { listDevices: vi.fn() }
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('distinguishes an ADB scan failure and recovers after a retry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    window.api.listDevices.mockRejectedValueOnce(
      new Error('ADB_DEVICE_SCAN_FAILED: spawn adb ENOENT')
    )
    const onSelect = vi.fn()

    render(<DeviceSelector onSelect={onSelect} selectedSerial={null} />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'ADB could not scan connected devices.'
    )
    expect(screen.getByText('Use a data-capable USB cable.')).toBeInTheDocument()

    fireEvent.click(screen.getByText('ADB error details'))
    expect(screen.getByText('spawn adb ENOENT')).toBeInTheDocument()

    window.api.listDevices.mockResolvedValueOnce([connectedDevice])
    fireEvent.click(screen.getByRole('button', { name: 'Scan again' }))

    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
    expect(onSelect).toHaveBeenCalledWith('quest-123')
  })

  it('shows connection steps for a successful scan with no attached headset', async () => {
    window.api.listDevices.mockResolvedValue([])

    render(<DeviceSelector onSelect={vi.fn()} selectedSerial={null} />)

    expect(await screen.findByRole('status')).toHaveTextContent('Quest not detected')
    expect(screen.getByText('Enable Developer Mode.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
