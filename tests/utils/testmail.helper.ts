import { GraphQLClient } from '@testmail.app/graphql-request';
import { randomUUID } from 'crypto';

// Create a GraphQL client for testmail.app
const testmailClient = new GraphQLClient('https://api.testmail.app/api/graphql', {
  headers: {
    Authorization: `Bearer ${process.env.TESTMAIL_API_KEY}`,
  },
});

const TESTMAIL_NAMESPACE = process.env.TESTMAIL_NAMESPACE;
if (!TESTMAIL_NAMESPACE) {
  // Soft warning so local devs know why tests may fail
  // eslint-disable-next-line no-console
  console.warn('TESTMAIL_NAMESPACE is not set. Email-based tests will fail.');
}
if (!process.env.TESTMAIL_API_KEY) {
  // eslint-disable-next-line no-console
  console.warn('TESTMAIL_API_KEY is not set. Email-based tests will fail.');
}

/**
 * Generates a unique email address for testing.
 * @returns An object with the tag and the full email address.
 */
export function generateTestEmail() {
  const tag = `user-${randomUUID()}`;
  const email = `${TESTMAIL_NAMESPACE}.${tag}@inbox.testmail.app`;
  return { tag, email };
}

/**
 * Polls testmail.app until an email with the specified tag is found.
 * @param tag The unique tag for the email.
 * @param timeout Max time to wait in ms.
 * @returns The email object from testmail.app.
 */
export async function waitForEmail(tag: string, timeout = 30000): Promise<any> {
  const startTime = Date.now();

  // GraphQL query to fetch latest emails for a namespace filtered by tag
  // Note: Schema names may evolve; we access defensively below.
  const QUERY = /* GraphQL */ `
    query FetchEmails($namespace: String!, $tag: String!) {
      inbox(namespace: $namespace) {
        messages(tag: $tag, limit: 5, order: DESC) {
          id
          subject
          from
          to
          html
          text
          createdAt
        }
      }
    }
  `;

  while (Date.now() - startTime < timeout) {
    try {
      const data: any = await testmailClient.request<any>(QUERY, {
        namespace: TESTMAIL_NAMESPACE,
        tag,
      });

      const emails: any[] =
        data?.inbox?.messages ||
        data?.inbox?.emails ||
        data?.emails ||
        [];

      if (Array.isArray(emails) && emails.length > 0) {
        return emails[0];
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('testmail.app API error, retrying...', error instanceof Error ? error.message : error);
    }

    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2s before retrying
  }
  throw new Error(`Email with tag "${tag}" not found within ${timeout}ms.`);
}

/**
 * Extracts the Supabase confirmation link from an email body.
 * @param emailBody The HTML or text content of the email.
 * @returns The confirmation URL.
 */
export function extractConfirmationLink(emailBody: string): string {
  // Try to match an anchor href first
  let regex = /href="(https?:\/\/[^"]*\/auth\/callback[^"]*)"/i;
  let match = emailBody.match(regex);

  if (!match) {
    // Fallback: match plain URL in the text
    regex = /(https?:\/\/[^\s"']*\/auth\/callback[^\s"']*)/i;
    match = emailBody.match(regex);
  }

  if (match && match[1]) {
    // The link might be HTML-escaped
    return match[1].replace(/&amp;/g, '&');
  }

  throw new Error('Could not extract confirmation link from email body.');
}