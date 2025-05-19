import React from 'react';
import { motion } from 'framer-motion';
import { 
  Card, 
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserPlus, ArrowRight, Mail, Link, Share2 } from 'lucide-react';

interface InviteFriendsTutorialProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function InviteFriendsTutorial({ onComplete, onSkip }: InviteFriendsTutorialProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md mx-auto"
    >
      <Card className="overflow-hidden border border-pink-200 dark:border-pink-800 shadow-lg">
        <div className="relative h-40 bg-gradient-to-r from-pink-500 to-rose-600 overflow-hidden">
          {/* Main icon */}
          <motion.div 
            className="absolute inset-0 flex items-center justify-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <UserPlus className="h-20 w-20 text-white" />
          </motion.div>

          {/* Connection animation */}
          <motion.div 
            className="absolute left-1/4 top-1/2 w-2 h-2 rounded-full bg-white"
            animate={{ 
              x: [0, 100, 0],
              opacity: [0.3, 1, 0.3]
            }}
            transition={{ 
              duration: 3,
              repeat: Infinity,
              repeatType: "loop"
            }}
          />
          <motion.div 
            className="absolute right-1/4 top-1/3 w-2 h-2 rounded-full bg-white"
            animate={{ 
              x: [-80, 0, -80],
              opacity: [0.3, 1, 0.3]
            }}
            transition={{ 
              duration: 2.5,
              delay: 0.5,
              repeat: Infinity,
              repeatType: "loop"
            }}
          />
          
          {/* User icons */}
          <motion.div
            className="absolute left-1/4 top-1/2 w-10 h-10 rounded-full bg-white flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.6, type: "spring" }}
          >
            <span className="text-pink-600 font-bold">You</span>
          </motion.div>
          
          <motion.div
            className="absolute right-1/4 top-1/3 w-10 h-10 rounded-full bg-white flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.9, type: "spring" }}
          >
            <span className="text-pink-600 font-bold">Friend</span>
          </motion.div>
        </div>

        <CardHeader>
          <CardTitle className="text-xl text-center">Invite Your Friends</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <div className="flex items-start mb-4">
              <div className="bg-pink-100 dark:bg-pink-900/30 p-2 rounded-full mr-3 mt-0.5">
                <Share2 className="h-5 w-5 text-pink-600 dark:text-pink-400" />
              </div>
              <div>
                <h3 className="font-medium">Click "Invite" in your group</h3>
                <p className="text-sm text-muted-foreground">
                  Start sharing expenses with friends
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="bg-pink-50 dark:bg-pink-900/20 p-4 rounded-lg border border-pink-100 dark:border-pink-800"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <h4 className="font-medium text-pink-700 dark:text-pink-300 mb-2">Share Your Group:</h4>
            <ul className="space-y-3 text-sm text-pink-600 dark:text-pink-400">
              <motion.li 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.4 }}
                className="flex items-center"
              >
                <div className="bg-pink-200 dark:bg-pink-800 rounded-full p-1.5 mr-2">
                  <Link className="h-4 w-4" />
                </div>
                <span>Generate an invite link to share</span>
              </motion.li>
              <motion.li 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.0, duration: 0.4 }}
                className="flex items-center"
              >
                <div className="bg-pink-200 dark:bg-pink-800 rounded-full p-1.5 mr-2">
                  <Mail className="h-4 w-4" />
                </div>
                <span>Invite directly via email</span>
              </motion.li>
            </ul>
          </motion.div>

          <motion.div
            className="bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 p-4 rounded-lg border border-pink-100 dark:border-pink-800"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.5 }}
          >
            <h4 className="font-medium text-pink-700 dark:text-pink-300 mb-2">Why invite friends?</h4>
            <ul className="space-y-2 text-sm text-pink-600 dark:text-pink-400">
              <motion.li 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.4, duration: 0.3 }}
                className="flex items-start"
              >
                <span className="mr-2">✓</span>
                <span>Everyone can view all expenses in real-time</span>
              </motion.li>
              <motion.li 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.6, duration: 0.3 }}
                className="flex items-start"
              >
                <span className="mr-2">✓</span>
                <span>Friends can add their own expenses to the group</span>
              </motion.li>
              <motion.li 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.8, duration: 0.3 }}
                className="flex items-start"
              >
                <span className="mr-2">✓</span>
                <span>Everyone stays on the same page about who owes what</span>
              </motion.li>
            </ul>
          </motion.div>
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button variant="ghost" onClick={onSkip}>
            Skip
          </Button>
          <Button 
            onClick={onComplete}
            className="bg-pink-600 hover:bg-pink-700 text-white"
          >
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

export default InviteFriendsTutorial;