import WalletPage from '@/features/wallet/wallet-page'
export default async function Page({ params }: { params: Promise<{verificationId: string}> }) { const { verificationId } = await params; return <WalletPage key={verificationId} id={verificationId}/> }
