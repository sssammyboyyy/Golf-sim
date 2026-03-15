export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: Request) {
    try {
        const { yocoId, pin } = await request.json()

        const validPin = process.env.ADMIN_PIN || "8821"

        if (pin !== validPin) {
            console.warn('[VERIFY] Unauthorized manual Yoco check attempted.')
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!yocoId) {
            return NextResponse.json({ error: 'Missing yocoId parameter' }, { status: 400 })
        }

        console.log(`[VERIFY] Admin requested direct Yoco status for ID: ${yocoId}`)

        const response = await fetch(`https://payments.yoco.com/api/checkouts/${yocoId}`, {
            headers: { Authorization: `Bearer ${process.env.YOCO_SECRET_KEY}` },
        })

        if (!response.ok) {
            console.error(`[VERIFY] Yoco API HTTP Error: ${response.status} ${response.statusText}`)
            return NextResponse.json(
                { error: `Payment gateway error. Check server logs for details.` },
                { status: response.status }
            )
        }

        const data = await response.json()
        return NextResponse.json({ success: true, yocoData: data })

    } catch (error: any) {
        console.error(`[VERIFY] Manual check error: ${error.message}`)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
