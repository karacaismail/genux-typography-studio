import '@mantine/code-highlight/styles.layer.css';
import { Button, Group, Modal, SegmentedControl, Stack, Text } from '@mantine/core';
import { CodeHighlight, CodeHighlightAdapterProvider, plainTextAdapter } from '@mantine/code-highlight';
import { notifications } from '@mantine/notifications';
import { CopyIcon, DownloadSimpleIcon } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import { buildExport, CONTEXT_IDS, changeCount, rolesOf, type Scope } from '../../core';
import { useStudio } from '../../store/studio';
import { useNextFrame } from '../../app/LazyMount';
import { useUi } from '../../store/ui';
import { downloadText, stamp } from './download';

export function ExportModal() {
  const ready = useNextFrame();
  const open = useUi((s) => s.exportOpen) && ready;
  const decisions = useStudio((s) => s.decisions);
  const fontStatus = useUi((s) => s.fontStatus);
  const [scope, setScope] = useState<Scope>('all');
  const json = useMemo(() => (open ? JSON.stringify(buildExport(decisions, scope, { env: { fontStatus } }), null, 2) : ''), [open, decisions, scope, fontStatus]);
  const changed = CONTEXT_IDS.reduce((n, c) => n + rolesOf(c).filter((r) => changeCount(decisions, c, r.id)).length, 0);
  const close = () => useUi.getState().set({ exportOpen: false });
  const name = `genux-tipografi-kararlari-${scope === 'changed' ? 'degisenler-' : ''}${stamp()}.json`;

  return (
    <Modal opened={open} onClose={close} title="Kararları dışa aktar" size="xl">
      <Stack gap="md">
        <Group justify="space-between" wrap="wrap" gap="sm">
          <SegmentedControl
            aria-label="Kapsam" value={scope} onChange={(v) => setScope(v as Scope)}
            data={[{ value: 'all', label: 'Tüm türler' }, { value: 'changed', label: `Yalnız değişenler (${changed})` }]}
          />
          <Text size="sm" c="dimmed">Biçim: genux-typography-decisions · sürüm 2 · {(json.length / 1024).toFixed(1)} KB</Text>
        </Group>
        <CodeHighlightAdapterProvider adapter={plainTextAdapter}>
          <CodeHighlight code={json} language="json" withCopyButton={false} mah={420} style={{ overflow: 'auto' }} />
        </CodeHighlightAdapterProvider>
        <Group justify="flex-end" gap="sm">
          <Button
            leftSection={<CopyIcon size={18} />}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(json);
                notifications.show({ title: 'Kopyalandı', message: 'JSON panoya kopyalandı.', autoClose: 2500 });
              } catch {
                notifications.show({ title: 'Kopyalanamadı', message: 'Tarayıcı panoya erişime izin vermedi; dosyayı indirin.', color: 'red' });
              }
            }}
          >
            Kopyala
          </Button>
          <Button variant="filled" leftSection={<DownloadSimpleIcon size={18} />} onClick={() => downloadText(name, json)}>
            JSON indir
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
