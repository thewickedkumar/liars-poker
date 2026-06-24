import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the Liar\'s Poker lobby', () => {
  render(<App />);
  // Brand bar + home hero both surface the title
  expect(screen.getAllByText(/liar's/i).length).toBeGreaterThan(0);
  expect(screen.getByText(/open a table/i)).toBeInTheDocument();
});
