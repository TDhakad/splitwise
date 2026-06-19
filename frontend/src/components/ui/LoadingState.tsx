interface LoadingStateProps {
  label?: string;
}

export default function LoadingState({ label = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="flex h-full min-h-48 items-center justify-center text-sm font-semibold text-gray-500">
      {label}
    </div>
  );
}
