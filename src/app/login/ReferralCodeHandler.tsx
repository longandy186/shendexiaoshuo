'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

interface ReferralCodeHandlerProps {
  onReferralCode: (code: string) => void;
}

export function ReferralCodeHandler({ onReferralCode }: ReferralCodeHandlerProps) {
  const searchParams = useSearchParams();

  useEffect(() => {
    // 优先从URL参数读取推荐码
    const ref = searchParams.get('ref');
    
    if (ref) {
      // URL中有推荐码，直接使用并更新localStorage
      localStorage.setItem('temp_referral_code', ref);
      onReferralCode(ref);
    } else {
      // URL中没有推荐码，尝试从localStorage读取
      const storedRef = localStorage.getItem('temp_referral_code');
      if (storedRef) {
        onReferralCode(storedRef);
      }
    }
  }, [searchParams, onReferralCode]);

  return null;
}
