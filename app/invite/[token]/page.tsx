import { getInvitationByToken } from '@/actions/invitation-actions';
import InviteClient from './InviteClient';

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getInvitationByToken(token);

  return <InviteClient token={token} invitation={result.success ? result.data! : null} />;
}
