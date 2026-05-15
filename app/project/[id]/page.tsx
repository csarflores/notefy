import { redirect } from 'next/navigation';

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const { id } = await params;

  // Redirect to parent-project page to see boards
  redirect(`/parent-project/${id}`);
}
