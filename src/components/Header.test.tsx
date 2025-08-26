import { render, screen, fireEvent } from '@testing-library/react';
import Header from './Header';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

// Mock the useAuth hook
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock the useRouter hook
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/components/ui/avatar', () => {
  const React = require('react');
  const Avatar = ({ children }) => <div>{children}</div>;
  const AvatarImage = ({ src, alt }) => <img src={src} alt={alt} />;
  const AvatarFallback = ({ children }) => <span>{children}</span>;
  return { Avatar, AvatarImage, AvatarFallback };
});

describe('Header', () => {
  const mockLogout = jest.fn();
  const mockRouter = {
    push: jest.fn(),
  };

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  it('renders the header with user information', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: {
        displayName: 'Test User',
        photoURL: 'https://example.com/avatar.png',
        email: 'test@example.com',
      },
      logout: mockLogout,
    });

    render(<Header />);

    // Check for title
    expect(screen.getByText('PollPulse')).toBeInTheDocument();

    // Check for "New Poll" button
    expect(screen.getByText('New Poll')).toBeInTheDocument();

    // Check for avatar
    const avatar = screen.getByAltText('Test User');
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.png');

    // Check for logout button
    const logoutButton = screen.getByTitle('Sign out');
    expect(logoutButton).toBeInTheDocument();
  });

  it('calls logout when the logout button is clicked', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: {
        displayName: 'Test User',
        photoURL: 'https://example.com/avatar.png',
        email: 'test@example.com',
      },
      logout: mockLogout,
    });

    render(<Header />);

    const logoutButton = screen.getByTitle('Sign out');
    fireEvent.click(logoutButton);

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('navigates to /new when "New Poll" is clicked', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: {},
      logout: mockLogout,
    });

    render(<Header />);
    
    const newPollLink = screen.getByText('New Poll').closest('a');
    expect(newPollLink).toHaveAttribute('href', '/new');
  });

  it('navigates to / when the title is clicked', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: {},
      logout: mockLogout,
    });

    render(<Header />);

    const titleLink = screen.getByText('PollPulse').closest('a');
    expect(titleLink).toHaveAttribute('href', '/');
  });
});
