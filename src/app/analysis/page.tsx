import { useAnalysisOperations } from '@/hooks/useAnalysisOperation';
import { ReauthDialog } from '@/components/modals/ReauthDialog';

export default function AnalysisPage() {
  const { progress, startAnalysis, cancelAnalysis, reauthModal } = useAnalysisOperations();
  
  return (
    <div>
      <ReauthDialog
        open={reauthModal.isOpen}
        onOpenChange={reauthModal.onOpenChange}
        type={reauthModal.type}
        eta={reauthModal.eta}
      />
    </div>
  );
} 