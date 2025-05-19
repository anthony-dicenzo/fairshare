import { motion } from 'framer-motion';

interface OnboardingProgressProps {
  steps: number;
  currentStep: number;
}

export function OnboardingProgress({ steps, currentStep }: OnboardingProgressProps) {
  // Calculate progress percentage
  const progressPercentage = (currentStep / (steps - 1)) * 100;
  
  return (
    <div className="relative w-full h-2 bg-muted rounded-full overflow-hidden mb-4">
      <motion.div 
        className="absolute top-0 left-0 h-full bg-primary"
        initial={{ width: 0 }}
        animate={{ width: `${progressPercentage}%` }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      />
    </div>
  );
}

export default OnboardingProgress;