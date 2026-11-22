import { EventsDiscoveryClient } from '../../components/Events/EventsDiscoveryClient';
import { MOCK_TICKETMASTER_EVENTS } from '../../lib/events/mockEvents';
import { fetchCommunityEventsServer } from '../../lib/events/serverCommunityEvents';

export const revalidate = 60;

export const metadata = {
  title: 'Discover Events | Soloberty',
  description:
    'Discover local Ticketmaster and community events, ask Soloberty Scout AI for tailored recommendations, or host your own meetup.',
};

export default async function DiscoverPage() {
  const initialCommunityEvents = await fetchCommunityEventsServer();
  return (
    <EventsDiscoveryClient
      initialEvents={MOCK_TICKETMASTER_EVENTS}
      initialCommunityEvents={initialCommunityEvents}
    />
  );
}
