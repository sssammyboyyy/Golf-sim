'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Search, XCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#Fdfbf7] flex items-center justify-center font-sans">Loading...</div>}>
      <BookingSuccessContent />
    </Suspense>
  );
}

function BookingSuccessContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId') || searchParams.get('reference');

  const [status, setStatus] = useState<'verifying' | 'confirmed' | 'failed' | 'not_found'>('verifying');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) {
      setStatus('not_found');
      return;
    }

    // 1. Initial Check
    const checkInitialStatus = async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('status')
        .eq('id', bookingId)
        .single();

      if (error) {
        console.error('Error fetching initial booking status:', error);
        setStatus('failed');
        setErrorDetails('Could not fetch booking details.');
        return;
      }

      if (data?.status === 'confirmed') {
        setStatus('confirmed');
      } else if (data?.status === 'cancelled' || data?.status === 'refunded' || data?.status === 'expired') {
        setStatus('failed');
        setErrorDetails(`Booking is currently ${data.status}`);
      }
      // If pending, we wait for the realtime event
    };

    checkInitialStatus();

    // 2. Realtime Subscription (The new Event-Driven way)
    const channel = supabase
      .channel(`booking_updates_${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `id=eq.${bookingId}`,
        },
        (payload: any) => {
          console.log('Realtime DB Update received!', payload);
          const newStatus = payload.new.status;

          if (newStatus === 'confirmed') {
            setStatus('confirmed');
          } else if (['cancelled', 'refunded', 'expired'].includes(newStatus)) {
            setStatus('failed');
            setErrorDetails(`Booking status changed to ${newStatus}`);
          }
        }
      )
      .subscribe((subStatus: string) => {
        console.log(`Supabase Realtime subscription status:`, subStatus);
      });

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId]);

  return (
    <div className="min-h-screen bg-[#Fdfbf7] flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-center space-y-6">

        {status === 'verifying' && (
          <div className="space-y-4 animate-in fade-in duration-500">
            <div className="mx-auto w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center mb-6">
              <RefreshCw className="w-8 h-8 text-[#FF4500] animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-[#1A1A1A]">Verifying Payment</h1>
            <p className="text-[#4A4A4A] leading-relaxed">
              We're waiting for secure confirmation from the payment provider. This usually takes just a few seconds...
            </p>
          </div>
        )}

        {status === 'confirmed' && (
          <div className="space-y-4 animate-in zoom-in-95 duration-500">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-6">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-[#1A1A1A]">Booking Confirmed!</h1>
            <p className="text-[#4A4A4A] leading-relaxed">
              Your payment was successful and your bay is reserved. We've emailed you the confirmation.
            </p>
            <div className="mt-8 pt-8 border-t border-gray-100 flex flex-col gap-3">
              <a
                href="/booking"
                className="bg-[#1A1A1A] text-white px-8 py-3 rounded-full font-medium hover:bg-black transition-colors"
                onClick={() => {
                  if (typeof window !== 'undefined') window.location.href = '/booking';
                }}
              >
                Book Another Session
              </a>
              <a
                href="/"
                className="border border-gray-200 text-[#4A4A4A] px-8 py-3 rounded-full font-medium hover:bg-gray-50 transition-colors"
              >
                Return to Home
              </a>
            </div>
          </div>
        )}

        {status === 'failed' && (
          <div className="space-y-4 animate-in fade-in duration-500">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-6">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-[#1A1A1A]">Verification Issue</h1>
            <p className="text-[#4A4A4A]">
              {errorDetails || "We couldn't confirm your payment. If you've been charged, please contact support."}
            </p>
            <div className="mt-8 pt-8 border-t border-gray-100 flex gap-4">
              <a
                href="/booking"
                className="flex-1 bg-[#1A1A1A] text-white px-6 py-3 rounded-full font-medium hover:bg-black transition-colors"
              >
                Try Again
              </a>
            </div>
          </div>
        )}

        {status === 'not_found' && (
          <div className="space-y-4 animate-in fade-in duration-500">
            <div className="mx-auto w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-6">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h1 className="text-2xl font-bold text-[#1A1A1A]">Booking Not Found</h1>
            <p className="text-[#4A4A4A]">
              We couldn't find the booking reference.
            </p>
            <div className="mt-8 pt-8 border-t border-gray-100">
              <a
                href="/"
                className="inline-block bg-[#1A1A1A] text-white px-8 py-3 rounded-full font-medium hover:bg-black transition-colors"
              >
                Return to Home
              </a>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
