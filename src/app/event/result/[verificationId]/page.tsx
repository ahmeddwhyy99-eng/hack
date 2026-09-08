import ResultPage from '@/features/event/result-page'
export default async function Page({ params }: { params: Promise<{verificationId: string}> }) { const { verificationId } = await params; return <ResultPage key={verificationId} id={verificationId}/> }
