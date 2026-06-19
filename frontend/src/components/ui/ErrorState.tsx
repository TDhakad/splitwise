interface ErrorStateProps {
  title?: string;
  message?: string;
}

export default function ErrorState({ title = 'Something went wrong', message = 'Please try again.' }: ErrorStateProps) {
  return (
    <div className="flex h-full min-h-48 items-center justify-center p-8">
      <div className="max-w-md rounded-2xl border border-red-100 bg-white p-6 text-center shadow-sm">
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
        <p className="mt-2 text-sm font-medium text-gray-500">{message}</p>
      </div>
    </div>
  );
}
