# Split the Bill

Enter who was at the table, what each person ordered and shared, the tax and tip, and who actually paid. The app
works out everyone's share to the cent and the fewest payments that settle the table.

React 19 and TypeScript, built with Vite, tested with Vitest and Testing Library. No backend: the bill is saved in
the browser, so a reload keeps it.

## Run it

```
npm install
npm run dev        # http://localhost:5173
npm test           # logic and screen tests
npm run build
```

## How the money works

- Every amount is whole cents, never a float, so totals always add up. Typed amounts take a dot or a comma as the
  decimal mark and at most two decimals.
- A shared dish is split evenly. When it does not divide exactly, the spare cents go to the first people on it, one
  each, so the result is the same every time.
- Tax and tip are shared out in proportion to what each person ordered, so the steak carries more tax than the soup.
  Leftover cents go by largest remainder.
- Settle-up uses the fewest payments. The app groups people whose balances cancel out and settles each group on its
  own, which finds the true minimum when up to 16 people have something to pay or receive. Above that it falls back to
  a greedy match, which still settles everyone in fewer payments than there are people.
- Problems that make the numbers wrong (a dish nobody shared, a negative price, payments that do not match the bill)
  hold back the settle-up. Softer slips, such as a missing name or nobody having paid yet, show as warnings.

## How the code is laid out

```
src/lib      pure functions: money, split, settle-up, checks (no React)
src/state    one hook, useBill, holding the bill and every action
src/ui       the screens
```

For the bill and its money, the screens import from `src/state` and nothing else. All the money logic sits behind that one entry point, so the
interface can change without touching the maths, and the maths is tested on its own.

## Tests

- `src/lib/*.test.ts`: splitting, proration, rounding, settle-up and the checks, including the edge cases (ties in
  rounding, several people owed money at once, odd input like `1,234`).
- `src/App.test.tsx`: the screens as a person uses them, such as a reload keeping the currency, a blank amount
  becoming zero, and the settle-up never saying "square" before anyone has paid.

## How it was built

I build with AI coding agents every day, and this app was made that way. I set the architecture, the money rules and
the line between logic and screens, and I reviewed and tested every change the agents made.
