import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app header title', () => {
  render(<App />);
  const title = screen.getByText(/ClassHelper V2/i);
  expect(title).toBeInTheDocument();
});
