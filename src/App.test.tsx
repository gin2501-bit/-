import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders header and controls', () => {
    render(<App />);
    expect(screen.getByText('Rhythm Flow')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'スタート' })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: /スクロール速度/i })).toBeInTheDocument();
  });
});
