import { useState, useEffect } from 'react';
import { Modal, Switch, Typography, Input, Space, message } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import client from '../../api/client';
import type { ShareLink } from '../../types';

interface ShareModalProps {
  dashboardId: number;
  open: boolean;
  onClose: () => void;
}

export default function ShareModal({ dashboardId, open, onClose }: ShareModalProps) {
  const [shareLink, setShareLink] = useState<ShareLink | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) loadShareLink();
  }, [open]);

  const loadShareLink = async () => {
    setLoading(true);
    try {
      const res = await client.post(`/dashboards/${dashboardId}/share`);
      setShareLink(res.data);
    } catch {
      message.error('Failed to get share link');
    }
    setLoading(false);
  };

  const toggleEnabled = async (enabled: boolean) => {
    try {
      const res = await client.put(`/dashboards/${dashboardId}/share`, { is_enabled: enabled });
      setShareLink(res.data);
      message.success(enabled ? 'Share link enabled' : 'Share link disabled');
    } catch {
      message.error('Failed to update share link');
    }
  };

  const shareUrl = shareLink ? `${window.location.origin}/public/${shareLink.token}` : '';

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    message.success('Link copied');
  };

  return (
    <Modal title="Share Dashboard" open={open} onCancel={onClose} footer={null}>
      {shareLink && (
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Typography.Text strong>Enabled:</Typography.Text>
            <Switch checked={shareLink.is_enabled} onChange={toggleEnabled} loading={loading} />
          </div>
          {shareLink.is_enabled && (
            <div>
              <Typography.Text type="secondary">Anyone with this link can view the dashboard:</Typography.Text>
              <Input.Search
                value={shareUrl}
                readOnly
                enterButton={<CopyOutlined />}
                onSearch={copyLink}
                style={{ marginTop: 8 }}
              />
            </div>
          )}
        </Space>
      )}
    </Modal>
  );
}
