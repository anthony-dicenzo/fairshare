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
import { DollarSign, ArrowRight, Plus, Users, SplitSquareVertical } from 'lucide-react';

interface AddExpenseTutorialProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function AddExpenseTutorial({ onComplete, onSkip }: AddExpenseTutorialProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md mx-auto"
    >
      <Card className="overflow-hidden border border-purple-200 dark:border-purple-800 shadow-lg">
        <div className="relative h-40 bg-gradient-to-r from-purple-500 to-indigo-600 overflow-hidden">
          {/* Main icon */}
          <motion.div 
            className="absolute inset-0 flex items-center justify-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <DollarSign className="h-20 w-20 text-white" />
          </motion.div>

          {/* Animated coins */}
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-8 h-8 rounded-full bg-yellow-300"
              initial={{ 
                x: Math.random() * 300 - 150,
                y: 200,
                opacity: 0
              }}
              animate={{ 
                y: -100,
                opacity: [0, 1, 0],
                scale: [0.8, 1, 0.8]
              }}
              transition={{ 
                duration: 2 + Math.random() * 2,
                repeat: Infinity,
                delay: i * 0.5,
                repeatDelay: Math.random() * 2
              }}
              style={{
                left: `${30 + i * 10}%`,
              }}
            />
          ))}
        </div>

        <CardHeader>
          <CardTitle className="text-xl text-center">Add Your First Expense</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <div className="flex items-start mb-4">
              <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-full mr-3 mt-0.5">
                <Plus className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="font-medium">Click the "+" button</h3>
                <p className="text-sm text-muted-foreground">
                  You'll find it in your group page
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-100 dark:border-purple-800"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <h4 className="font-medium text-purple-700 dark:text-purple-300 mb-2">3 Simple Steps:</h4>
            <ul className="space-y-3 text-sm text-purple-600 dark:text-purple-400">
              <motion.li 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.4 }}
                className="flex items-center"
              >
                <div className="bg-purple-200 dark:bg-purple-800 rounded-full w-5 h-5 flex items-center justify-center mr-2 text-xs font-bold">1</div>
                <div className="flex items-center">
                  <DollarSign className="h-4 w-4 mr-1" />
                  <span>Enter the expense amount and description</span>
                </div>
              </motion.li>
              <motion.li 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.0, duration: 0.4 }}
                className="flex items-center"
              >
                <div className="bg-purple-200 dark:bg-purple-800 rounded-full w-5 h-5 flex items-center justify-center mr-2 text-xs font-bold">2</div>
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-1" />
                  <span>Select who paid for the expense</span>
                </div>
              </motion.li>
              <motion.li 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2, duration: 0.4 }}
                className="flex items-center"
              >
                <div className="bg-purple-200 dark:bg-purple-800 rounded-full w-5 h-5 flex items-center justify-center mr-2 text-xs font-bold">3</div>
                <div className="flex items-center">
                  <SplitSquareVertical className="h-4 w-4 mr-1" />
                  <span>Choose how to split it (equal, percentage, etc.)</span>
                </div>
              </motion.li>
            </ul>
          </motion.div>

          {/* Example expense visualization */}
          <motion.div 
            className="relative bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 overflow-hidden mt-1"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ delay: 1.4, duration: 0.5 }}
          >
            <div className="text-sm font-medium mb-1">Example:</div>
            <div className="text-xs space-y-1 text-gray-600 dark:text-gray-300">
              <div className="flex justify-between">
                <span>Dinner at Luigi's</span>
                <span className="font-semibold">$75.00</span>
              </div>
              <div className="flex justify-between">
                <span>Paid by: <span className="text-purple-600 dark:text-purple-400">You</span></span>
                <span>Split: <span className="text-purple-600 dark:text-purple-400">Equally</span></span>
              </div>
              <div className="mt-2 pt-2 border-t border-dashed border-gray-200 dark:border-gray-700">
                <span className="text-green-600 dark:text-green-400">FairShare automatically calculates who owes what!</span>
              </div>
            </div>
          </motion.div>
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button variant="ghost" onClick={onSkip}>
            Skip
          </Button>
          <Button 
            onClick={onComplete}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            I've Added an Expense
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

export default AddExpenseTutorial;