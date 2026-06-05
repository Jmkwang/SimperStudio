import { useState, useEffect } from 'react';
import { Sparkles, Bot, MessageSquare } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

const ONBOARDING_KEY = 'ss_onboarding_done';

const STEPS = [
  {
    titleKey: '欢迎来到 SimperStudio',
    descKey: '您的 AI 驱动工作流工作室',
    Icon: Sparkles,
  },
  {
    titleKey: '创建智能体',
    descKey: '配置您的第一个 AI 助手',
    Icon: Bot,
  },
  {
    titleKey: '开始对话',
    descKey: '与智能体开始对话或设计工作流',
    Icon: MessageSquare,
  },
] as const;

export function OnboardingGuide() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const done = localStorage.getItem(ONBOARDING_KEY);
    if (!done) {
      setOpen(true);
    }
  }, []);

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleFinish = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setOpen(false);
  };

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleFinish(); else setOpen(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
          {/* Step dots */}
          <div className="flex items-center gap-2 mb-4">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === step
                    ? 'w-6 bg-primary'
                    : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
                aria-label={`Step ${i + 1}`}
              />
            ))}
          </div>

          {/* Icon */}
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/15 mb-2">
            <current.Icon className="h-8 w-8 text-primary" strokeWidth={1.5} />
          </div>

          <DialogTitle className="text-xl">{t(current.titleKey)}</DialogTitle>
          <DialogDescription>{t(current.descKey)}</DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-row gap-2 sm:justify-center">
          {step > 0 && (
            <button
              onClick={handleBack}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
            >
              {t('返回')}
            </button>
          )}
          {isLast ? (
            <button
              onClick={handleFinish}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {t('开始使用')}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {t('下一步')}
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
