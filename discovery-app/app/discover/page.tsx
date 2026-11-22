import { EventsDiscoveryClient } from '../../components/Events/EventsDiscoveryClient';
import { MOCK_TICKETMASTER_EVENTS } from '../../lib/events/mockEvents';

export const metadata = {
  title: 'Discover Events | Soloberty',
  description:
    'Discover local Ticketmaster and community events, ask Soloberty Scout AI for tailored recommendations, or host your own meetup.',
};

export default function DiscoverPage() {
  return <EventsDiscoveryClient initialEvents={MOCK_TICKETMASTER_EVENTS} />;
}
