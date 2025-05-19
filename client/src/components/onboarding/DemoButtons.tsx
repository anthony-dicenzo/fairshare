import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * This component adds some buttons with specific classes and data attributes
 * to help test the interactive guide functionality.
 */
export function DemoButtons() {
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-base">Demo Buttons for Testing</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Button 
          className="add-group-button" 
          data-tour="create-group"
        >
          Create group
        </Button>
        
        <Button 
          className="add-expense-button"
          data-tour="add-expense" 
          variant="outline"
        >
          + Add expense
        </Button>
        
        <Button 
          className="invite-button"
          data-tour="invite-button"
          variant="secondary"
        >
          Invite
        </Button>
        
        <div className="border rounded p-2 w-full mt-2">
          <label className="block text-xs mb-1">Invite Link:</label>
          <input 
            type="text" 
            className="w-full p-1 border rounded text-sm invite-link" 
            data-tour="invite-link"
            readOnly
            value="https://fairshare.app/invite/ABC123"
          />
        </div>
        
        <div className="border rounded p-2 w-full mt-2">
          <label className="block text-xs mb-1">Expense Form:</label>
          <input 
            type="text" 
            className="w-full p-1 border rounded text-sm" 
            data-tour="expense-form"
            name="description"
            placeholder="Expense description"
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default DemoButtons;