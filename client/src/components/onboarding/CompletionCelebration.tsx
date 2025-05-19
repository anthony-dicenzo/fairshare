import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Card, 
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, CheckCircle } from 'lucide-react';
import { celebrateSuccess } from '@/components/ui/confetti';

interface CompletionCelebrationProps {
  onComplete: () => void;
}

export function CompletionCelebration({ onComplete }: CompletionCelebrationProps) {
  // Trigger confetti effect when component mounts
  useEffect(() => {
    celebrateSuccess();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md mx-auto"
    >
      <Card className="overflow-hidden border shadow-lg bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20">
        <div className="relative h-40 bg-gradient-to-r from-green-500 to-teal-500 overflow-hidden">
          {/* Main icon */}
          <motion.div 
            className="absolute inset-0 flex items-center justify-center"
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ 
              type: "spring",
              stiffness: 260,
              damping: 20,
              delay: 0.3
            }}
          >
            <CheckCircle className="h-24 w-24 text-white" />
          </motion.div>

          {/* Celebration animations */}
          <motion.div
            className="absolute inset-0 bg-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.3, 0] }}
            transition={{ duration: 0.8, delay: 0.1 }}
          />
          
          {/* Random particles */}
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{ 
                backgroundColor: ['#FFD700', '#3498db', '#2ecc71', '#e74c3c', '#9b59b6'][i % 5],
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`
              }}
              initial={{ scale: 0 }}
              animate={{ 
                scale: [0, 1, 0],
                y: [0, Math.random() * -30],
                x: [0, (Math.random() - 0.5) * 40]
              }}
              transition={{ 
                duration: 1 + Math.random(),
                delay: 0.3 + Math.random() * 0.5,
                repeat: Infinity,
                repeatDelay: Math.random() * 2
              }}
            />
          ))}
        </div>

        <CardHeader>
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <CardTitle className="text-2xl text-center">You're All Set! 🎉</CardTitle>
          </motion.div>
        </CardHeader>

        <CardContent className="space-y-4">
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="text-center text-muted-foreground"
          >
            You've completed the FairShare onboarding!
            Now you can easily track and split expenses with friends.
          </motion.p>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="bg-gradient-to-br from-green-100 to-teal-100 dark:from-green-900/30 dark:to-teal-900/30 p-4 rounded-lg"
          >
            <h4 className="font-medium text-green-800 dark:text-green-300 mb-2 text-center">Pro Tips:</h4>
            <ul className="space-y-2 text-sm text-green-700 dark:text-green-400">
              <motion.li 
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 1.0, duration: 0.3 }}
                className="flex items-start"
              >
                <span className="mr-2">✓</span>
                <span>Check your balances on the dashboard</span>
              </motion.li>
              <motion.li 
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 1.2, duration: 0.3 }}
                className="flex items-start"
              >
                <span className="mr-2">✓</span>
                <span>Settle debts using the "Settle Up" feature</span>
              </motion.li>
              <motion.li 
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 1.4, duration: 0.3 }}
                className="flex items-start"
              >
                <span className="mr-2">✓</span>
                <span>Check the Activity feed to see recent updates</span>
              </motion.li>
            </ul>
          </motion.div>
        </CardContent>

        <CardFooter>
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.6, duration: 0.5 }}
            className="w-full"
          >
            <Button 
              onClick={onComplete}
              className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white" 
              size="lg"
            >
              Start Using FairShare
              <Check className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

export default CompletionCelebration;