import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Card, 
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, ArrowRight, Users } from 'lucide-react';

interface CreateGroupTutorialProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function CreateGroupTutorial({ onComplete, onSkip }: CreateGroupTutorialProps) {
  const [animationComplete, setAnimationComplete] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md mx-auto"
    >
      <Card className="overflow-hidden border border-blue-200 dark:border-blue-800 shadow-lg">
        <div className="relative h-40 bg-gradient-to-r from-blue-500 to-indigo-600 overflow-hidden">
          {/* Main icon */}
          <motion.div 
            className="absolute inset-0 flex items-center justify-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Users className="h-20 w-20 text-white" />
          </motion.div>

          {/* Background animation elements */}
          <motion.div 
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-white/10"
            animate={{ 
              scale: [1, 1.5, 1],
              opacity: [0.3, 0.2, 0.3],
            }}
            transition={{ 
              duration: 4,
              repeat: Infinity,
              repeatType: "loop"
            }}
          />
          <motion.div 
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-white/5"
            animate={{ 
              scale: [1.2, 1, 1.2],
              opacity: [0.2, 0.3, 0.2],
            }}
            transition={{ 
              duration: 5,
              delay: 0.5,
              repeat: Infinity,
              repeatType: "loop"
            }}
          />
        </div>

        <CardHeader>
          <CardTitle className="text-xl text-center">Create Your First Group</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <div className="flex items-start mb-4">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full mr-3 mt-0.5">
                <PlusCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-medium">Click "Create group"</h3>
                <p className="text-sm text-muted-foreground">
                  Look for this button on the Groups page
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-2">Tips for groups:</h4>
            <ul className="space-y-2 text-sm text-blue-600 dark:text-blue-400">
              <motion.li 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.4 }}
                className="flex items-start"
              >
                <span className="mr-2">•</span>
                <span>Choose a descriptive name (e.g., "Vacation to Miami")</span>
              </motion.li>
              <motion.li 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.0, duration: 0.4 }}
                className="flex items-start"
              >
                <span className="mr-2">•</span>
                <span>Create different groups for different activities or people</span>
              </motion.li>
              <motion.li 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2, duration: 0.4 }}
                className="flex items-start"
              >
                <span className="mr-2">•</span>
                <span>You'll be able to invite people to your group later</span>
              </motion.li>
            </ul>
          </motion.div>

          {/* Floating button demonstration */}
          <motion.div 
            className="relative bg-gray-100 dark:bg-gray-800 rounded-lg p-4 h-16 overflow-hidden mt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4, duration: 0.4 }}
          >
            <div className="text-xs text-gray-500 dark:text-gray-400 absolute top-2 left-2">Groups page:</div>
            <motion.div
              className="absolute right-4 bottom-3 rounded-full bg-primary text-white px-3 py-1 text-sm flex items-center"
              initial={{ y: 30, opacity: 0 }}
              animate={{ 
                y: [30, 0, 0, 0, 30],
                opacity: [0, 1, 1, 1, 0],
                scale: [0.9, 1, 1.05, 1, 0.9]
              }}
              transition={{ 
                duration: 3,
                times: [0, 0.2, 0.5, 0.8, 1],
                repeat: Infinity,
                repeatDelay: 1
              }}
              onAnimationComplete={() => setAnimationComplete(true)}
            >
              <PlusCircle className="h-4 w-4 mr-1" />
              Create group
            </motion.div>
          </motion.div>
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button variant="ghost" onClick={onSkip}>
            Skip
          </Button>
          <Button 
            onClick={onComplete}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            I've Created a Group
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

export default CreateGroupTutorial;