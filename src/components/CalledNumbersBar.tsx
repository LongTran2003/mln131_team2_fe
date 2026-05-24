interface Props {
  called: number[];
  latest: number | null;
  sidebar?: boolean;
}

export function CalledNumbersBar({ called, latest, sidebar }: Props) {
  const calledSet = new Set(called);
  const cells = Array.from({ length: 40 }, (_, i) => i + 1);

  if (sidebar) {
    return (
      <div className="bg-white rounded-xl shadow p-2 sticky top-3">
        <div className="text-center mb-1.5">
          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Đã gọi</div>
          <div className="text-[10px] text-gray-400">{called.length}/40</div>
          {latest != null
            ? <div className="text-2xl font-bold text-red-500 animate-bounce leading-none py-1">{latest}</div>
            : <div className="h-9" />
          }
        </div>
        <div className="grid grid-cols-5 gap-1">
          {cells.map(n => (
            <div key={n} className={`aspect-square flex items-center justify-center text-[11px] font-mono rounded font-medium ${
              calledSet.has(n) ? 'bg-red-500 text-white font-bold' : 'bg-gray-100 text-gray-400'
            }`}>{n}</div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-sm">Số đã gọi ({called.length}/40)</h3>
        {latest != null && (
          <div className="text-3xl font-bold text-red-500 animate-bounce">{latest}</div>
        )}
      </div>
      <div className="grid grid-cols-10 gap-1">
        {cells.map(n => (
          <div key={n} className={`aspect-square flex items-center justify-center text-xs font-mono rounded ${
            calledSet.has(n) ? 'bg-red-500 text-white font-bold' : 'bg-gray-100 text-gray-300'
          }`}>{n}</div>
        ))}
      </div>
    </div>
  );
}