import '@mantine/dropzone/styles.layer.css';
import { Alert, Button, Group, Modal, Stack, Text, Timeline } from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import { CheckCircleIcon, FileArrowUpIcon, WarningIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { importData, type Decisions, type ImportReport } from '../../core';
import { notifyUndoable } from '../../app/actions';
import { useStudioSearch } from '../../app/useStudioSearch';
import { useStudio } from '../../store/studio';
import { useNextFrame } from '../../app/LazyMount';
import { useUi } from '../../store/ui';

interface Pending { name: string; decisions: Decisions; report: ImportReport }

export function ImportModal() {
  const ready = useNextFrame();
  const open = useUi((s) => s.importOpen) && ready;
  const [search] = useStudioSearch();
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState<string | null>(null);
  const close = () => { useUi.getState().set({ importOpen: false }); setPending(null); setError(null); };

  const read = async (file: File) => {
    setError(null);
    setPending(null);
    try {
      const data = JSON.parse(await file.text());
      const { decisions, report } = importData(data, useStudio.getState().decisions, search.ctx);
      setPending({ name: file.name, decisions, report });
    } catch (e) {
      setError(e instanceof SyntaxError ? 'Dosya geçerli JSON değil.' : e instanceof Error ? e.message : String(e));
    }
  };
  const apply = () => {
    if (!pending) return;
    useStudio.getState().replace(pending.decisions);
    notifyUndoable('Kararlar içe aktarıldı', `${pending.name} · ${pending.report.recognised} tür`);
    close();
  };

  return (
    <Modal opened={open} onClose={close} title="JSON içe aktar" size="lg">
      <Stack gap="md">
        <Dropzone
          onDrop={(files) => files[0] && read(files[0])}
          onReject={() => setError('Yalnız .json dosyası, en fazla 2 MB.')}
          accept={{ 'application/json': ['.json'] }}
          maxSize={2 * 1024 * 1024}
          multiple={false}
          aria-label="JSON dosyası seç ya da bırak"
        >
          <Group justify="center" gap="md" mih={120} style={{ pointerEvents: 'none' }}>
            <FileArrowUpIcon size={32} aria-hidden="true" />
            <div>
              <Text size="md" fw={500}>JSON dosyasını buraya bırakın ya da seçin</Text>
              <Text size="sm" c="dimmed">genux-typography-decisions · sürüm 1 ve 2 · en fazla 2 MB</Text>
            </div>
          </Group>
        </Dropzone>
        {error && <Alert color="red" icon={<WarningIcon size={18} />} title="İçe aktarılamadı">{error}</Alert>}
        {pending && (
          <>
            <Timeline active={4} bulletSize={22} lineWidth={2}>
              <Timeline.Item title="Dosya okundu" bullet={<CheckCircleIcon size={14} />}><Text size="sm" c="dimmed">{pending.name}</Text></Timeline.Item>
              <Timeline.Item title="Biçim doğrulandı" bullet={<CheckCircleIcon size={14} />}><Text size="sm" c="dimmed">{pending.report.notes.join(' ') || 'genux-typography-decisions'}</Text></Timeline.Item>
              <Timeline.Item title={`${pending.report.recognised} tür tanındı`} bullet={<CheckCircleIcon size={14} />} />
              <Timeline.Item title={`${pending.report.adjusted.length} değer kurallara göre düzeltildi`} bullet={pending.report.adjusted.length ? <WarningIcon size={14} /> : <CheckCircleIcon size={14} />}>
                {pending.report.adjusted.length > 0 && <Text size="sm" c="dimmed">{pending.report.adjusted.slice(0, 8).join(' · ')}{pending.report.adjusted.length > 8 ? ' …' : ''}</Text>}
              </Timeline.Item>
              <Timeline.Item title={`${pending.report.rejected.length} renk reddedildi (gri değil)`} bullet={pending.report.rejected.length ? <WarningIcon size={14} /> : <CheckCircleIcon size={14} />}>
                {pending.report.rejected.length > 0 && <Text size="sm" c="dimmed">{pending.report.rejected.slice(0, 6).join(' · ')}</Text>}
              </Timeline.Item>
            </Timeline>
            <Group justify="flex-end" gap="sm">
              <Button variant="default" onClick={close}>Vazgeç</Button>
              <Button variant="filled" onClick={apply}>Uygula</Button>
            </Group>
          </>
        )}
      </Stack>
    </Modal>
  );
}
