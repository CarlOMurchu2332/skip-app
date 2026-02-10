import Link from 'next/link';
import Image from 'next/image';

// Force fresh deployment
export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <div className="mb-6 flex justify-center">
          <Image
            src="/imr-logo.png"
            alt="Irish Metals Logo"
            width={220}
            height={80}
            priority
          />
        </div>
        <h1 className="text-4xl font-bold text-white mb-2">Skip App</h1>
        <p className="text-gray-400 mb-8">Irish Metals Dispatch System</p>
        
        <div className="space-y-4">
          <Link
            href="/office/skips"
            className="block w-64 mx-auto px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
          >
            🏢 Office Dashboard
          </Link>

          <div className="pt-4 border-t border-gray-700 mt-4">
            <p className="text-gray-500 text-sm mb-3">Driver Access</p>
            <Link
              href="/driver/jobs"
              className="block w-64 mx-auto px-6 py-4 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-semibold transition-colors"
            >
              🚛 Driver Portal
            </Link>
          </div>
        </div>

        <p className="mt-12 text-gray-500 text-sm">
          Unit 2, Duleek Business Park, Co. Meath, A92 TK20
        </p>
      </div>
    </div>
  );
}
