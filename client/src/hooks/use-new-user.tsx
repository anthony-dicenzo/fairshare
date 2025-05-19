import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { useAuth } from './use-auth';
import { useOnboarding } from './use-onboarding';

interface NewUserContextProps {
  isNewUser: boolean;
  markUserAsExisting: () => void;
}

// Create context with default values
const NewUserContext = createContext<NewUserContextProps>({
  isNewUser: false,
  markUserAsExisting: () => {},
});

// Key for local storage
const NEW_USER_KEY = 'fairshare_existing_user';

export function NewUserProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const [isNewUser, setIsNewUser] = useState<boolean>(false);

  // Check if this is a new user when they log in
  useEffect(() => {
    if (user) {
      // Check if this user is marked as existing in localStorage
      const existingUserData = localStorage.getItem(NEW_USER_KEY);
      let existingUsers: string[] = [];
      
      if (existingUserData) {
        try {
          existingUsers = JSON.parse(existingUserData);
        } catch (e) {
          console.error('Error parsing existing user data:', e);
          localStorage.setItem(NEW_USER_KEY, JSON.stringify([]));
        }
      }
      
      // If the user's ID is not in the list, they're new
      if (!existingUsers.includes(user.username)) {
        console.log('Starting onboarding for new user:', user.username);
        setIsNewUser(true);
        
        // Store username in localStorage so we can track names shown on login
        localStorage.setItem('fairshare_username', user.username);
      }
    }
  }, [user]);

  // Function to mark a user as no longer new
  const markUserAsExisting = () => {
    if (user) {
      // Get existing users
      const existingUserData = localStorage.getItem(NEW_USER_KEY);
      let existingUsers: string[] = [];
      
      if (existingUserData) {
        try {
          existingUsers = JSON.parse(existingUserData);
        } catch (e) {
          console.error('Error parsing existing user data:', e);
        }
      }
      
      // Add this user to the list if not already there
      if (!existingUsers.includes(user.username)) {
        existingUsers.push(user.username);
        localStorage.setItem(NEW_USER_KEY, JSON.stringify(existingUsers));
      }
      
      // Mark as no longer new
      setIsNewUser(false);
      completeOnboarding();
    }
  };

  return (
    <NewUserContext.Provider
      value={{
        isNewUser,
        markUserAsExisting,
      }}
    >
      {children}
    </NewUserContext.Provider>
  );
}

export function useNewUser() {
  const context = useContext(NewUserContext);
  
  if (context === undefined) {
    throw new Error('useNewUser must be used within a NewUserProvider');
  }
  
  return context;
}