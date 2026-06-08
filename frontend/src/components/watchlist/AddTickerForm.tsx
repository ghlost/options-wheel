import { useState } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface Props {
  onAdd: (ticker: string) => Promise<void>;
}

export function AddTickerForm({ onAdd }: Props) {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ticker = value.trim().toUpperCase();
    if (!ticker) return;
    setLoading(true);
    setError(null);
    try {
      await onAdd(ticker);
      setValue('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add ticker');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Input
        value={value}
        onChange={e => setValue(e.target.value.toUpperCase())}
        placeholder="AAPL"
        maxLength={5}
        disabled={loading}
        className="w-full"
      />
      <Button type="submit" disabled={loading || !value.trim()} size="md" className="w-full">
        {loading ? '...' : 'Add'}
      </Button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </form>
  );
}
