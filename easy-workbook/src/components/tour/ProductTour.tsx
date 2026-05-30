import { Joyride, STATUS } from 'react-joyride';
import type { Step, EventData } from 'react-joyride';
import { useUiStore } from '@/store/uiStore';
import { HelpCircle } from 'lucide-react';

export function ProductTour() {
  const runTour = useUiStore((s) => s.runTour);
  const setRunTour = useUiStore((s) => s.setRunTour);

  const steps: Step[] = [
    {
      target: 'body',
      content: (
        <div className="text-left">
          <h3 className="text-lg font-bold text-surface-50 mb-2 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-brand-400" />
            Welcome to Easy Workbook!
          </h3>
          <p className="text-sm text-surface-300">
            Let's take a quick tour to see how you can create your own practice sheets easily.
          </p>
        </div>
      ),
      placement: 'center',
    },
    {
      target: '.tour-select-mode',
      content: (
        <div className="text-left">
          <h4 className="font-bold text-surface-50 mb-1">Select Questions</h4>
          <p className="text-sm text-surface-300">
            Click here to enter Selection Mode. You can then click and drag on the PDF to highlight and extract questions.
          </p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '.tour-sidebar-toggle',
      content: (
        <div className="text-left">
          <h4 className="font-bold text-surface-50 mb-1">Sidebar</h4>
          <p className="text-sm text-surface-300">
            Toggle the sidebar to view, manage, and reorder all the questions you've selected.
          </p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '.tour-export-btn',
      content: (
        <div className="text-left">
          <h4 className="font-bold text-surface-50 mb-1">Export Workbook</h4>
          <p className="text-sm text-surface-300">
            When you're ready, click here to export your questions as a beautiful PDF or an interactive HTML practice sheet!
          </p>
        </div>
      ),
      placement: 'bottom-end',
    },
  ];

  const handleJoyrideCallback = (data: EventData) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRunTour(false);
    }
  };

  return (
    <Joyride
      steps={steps}
      run={runTour}
      continuous={true}
      onEvent={handleJoyrideCallback}
      options={{
        showProgress: true,
        buttons: ['back', 'close', 'primary', 'skip'],
        arrowColor: '#27272a', // surface-800
        backgroundColor: '#27272a', // surface-800
        overlayColor: 'rgba(9, 9, 11, 0.7)', // surface-950 with opacity
        primaryColor: '#8b5cf6', // brand-500
        textColor: '#e4e4e7', // surface-100
        zIndex: 1000,
      }}
      styles={{
        tooltipContainer: {
          textAlign: 'left',
        },
        buttonPrimary: {
          backgroundColor: '#8b5cf6',
          borderRadius: '8px',
          fontWeight: 600,
          padding: '8px 16px',
        },
        buttonBack: {
          color: '#a1a1aa',
          marginRight: '8px',
        },
        buttonSkip: {
          color: '#a1a1aa',
          fontSize: '13px',
        },
        tooltip: {
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #3f3f46',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)',
        }
      }}
    />
  );
}
