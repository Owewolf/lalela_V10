import { Community } from './types';

export const MOCK_COMMUNITIES: Community[] = [
  {
    id: 'parkwood',
    name: 'Parkwood',
    owner_id: 'mock-owner',
    type: 'TRIAL',
    trial_end_date: '2026-05-01T00:00:00Z',
    status: 'Live',
    userRole: 'Admin',
    alerts: [
      {
        id: 'a1',
        title: 'Security update in Block B',
        description: 'Local security patrol has identified unauthorized access at the North Gate. Please ensure all residents remain indoors until further notice.',
        timestamp: '2 mins ago',
        priority: 'High'
      }
    ],
    notices: [
      {
        id: 'n1',
        type: 'notice',
        category: 'Infrastructure',
        title: 'Water Maintenance: Scheduled Outage in Zone 4',
        description: 'Scheduled maintenance for main reservoirs will affect water pressure and supply this Saturday from 08:00 to 16:00. Please store enough water beforehand.',
        authorName: 'Thabo Mdluli',
        authorRole: 'Community Liaison',
        authorImage: 'https://picsum.photos/seed/thabo/100/100',
        timestamp: '3h ago',
        isLarge: true
      },
      {
        id: 'n2',
        type: 'notice',
        category: 'Market',
        title: 'Farmers Market this Sunday',
        description: 'Join us at the Central Park for fresh local produce and crafts...',
        authorName: 'Sarah Jenkins',
        authorRole: 'Market Organizer',
        authorImage: 'https://picsum.photos/seed/sarah/100/100',
        timestamp: '5h ago'
      },
      {
        id: 'n3',
        type: 'notice',
        category: 'Health',
        title: 'Mobile Clinic Schedule',
        description: 'The clinic will be stationed at the Library parking lot on Tuesday...',
        authorName: 'Dr. Mike',
        authorRole: 'Health Officer',
        authorImage: 'https://picsum.photos/seed/mike/100/100',
        timestamp: '1d ago'
      }
    ],
    businesses: [
      {
        id: 'b1',
        name: 'Green Roots Gardens',
        distance: '0.4 km',
        category: 'Sustainable Nursery',
        status: 'Open',
        image: 'https://picsum.photos/seed/nursery/400/400',
        labelType: 'top-rated',
        neighbors: 8
      },
      {
        id: 'b2',
        name: 'Duma Plumbing',
        distance: '1.2 km',
        category: 'Repairs • Emergency services',
        status: 'Open',
        icon: 'Wrench',
        iconBg: 'bg-primary-container',
        iconColor: 'text-white',
        label: 'Top Rated Local',
        labelType: 'top-rated',
        hasCall: true
      }
    ],
    chats: [
      {
        id: 'c1',
        name: 'Bicycle for Sale',
        type: 'individual',
        members: [{ name: 'Thabo Mokoena', role: 'Member', image: 'https://picsum.photos/seed/thabo/100/100' }],
        unreadCount: 2,
        linkedItem: {
          type: 'listing',
          title: 'Bicycle for Sale',
          price: 'R200',
          image: 'https://picsum.photos/seed/bike/800/600',
          author: 'Thabo Mokoena',
          authorRole: 'Member',
          timestamp: 'Today'
        },
        lastMessage: {
          id: 'm1',
          senderName: 'Thabo Mokoena',
          senderRole: 'Member',
          senderImage: 'https://picsum.photos/seed/thabo/100/100',
          text: 'Hi! Thanks for reaching out. The bike is in...',
          timestamp: '12:45 PM',
          badge: { text: 'New Listing', type: 'listing' }
        }
      },
      {
        id: 'c2',
        name: 'Road Closure: Main Street',
        type: 'individual',
        members: [{ name: 'Sarah Jenkins', role: 'Admin', image: 'https://picsum.photos/seed/sarah/100/100' }],
        linkedItem: {
          type: 'notice',
          title: 'Road Closure: Main Street',
          description: 'Urgent infrastructure repairs starting at 08:00 tomorrow. Main Street will be completely inaccessible between 4th and 8th Avenue for 48 hours.',
          author: 'Sarah Jenkins',
          authorRole: 'Admin',
          timestamp: '2h ago',
          priority: 'Emergency'
        },
        lastMessage: {
          id: 'm2',
          senderName: 'Sarah Jenkins',
          senderRole: 'Admin',
          senderImage: 'https://picsum.photos/seed/sarah/100/100',
          text: 'Road Closure: Main Street repairs starting...',
          timestamp: '10:52 AM',
          badge: { text: 'New Notice', type: 'post' }
        }
      },
      {
        id: 'c3',
        name: 'Lerato Dlamini',
        type: 'individual',
        members: [{ name: 'Lerato Dlamini', role: 'Liaison', image: 'https://picsum.photos/seed/lerato/100/100' }],
        lastMessage: {
          id: 'm3',
          senderName: 'Lerato Dlamini',
          senderRole: 'Liaison',
          senderImage: 'https://picsum.photos/seed/lerato/100/100',
          text: 'Thank you for helping with the fence repair!',
          timestamp: 'Mon'
        }
      },
      {
        id: 'c4',
        name: 'Green Valley Farmers',
        type: 'group',
        members: [
          { name: 'Sarah', role: 'Admin', image: 'https://picsum.photos/seed/sarah/100/100' },
          { name: 'Mike', role: 'Member', image: 'https://picsum.photos/seed/mike/100/100' }
        ],
        lastMessage: {
          id: 'm4',
          senderName: 'Sarah',
          senderRole: 'Admin',
          senderImage: 'https://picsum.photos/seed/sarah/100/100',
          text: 'Sarah: The irrigation meeting is moved to...',
          timestamp: 'Yesterday'
        }
      }
    ]
  },
  {
    id: 'kwamashu-north',
    name: 'Kwamashu North',
    owner_id: 'mock-owner-2',
    type: 'TRIAL',
    trial_end_date: '2026-05-01T00:00:00Z',
    status: 'Live',
    userRole: 'Moderator',
    alerts: [
      {
        id: 'a2',
        title: 'Power Grid Maintenance',
        description: 'Expect intermittent power supply in the Northern sector due to transformer upgrades.',
        timestamp: '15 mins ago',
        priority: 'Medium'
      }
    ],
    notices: [
      {
        id: 'n4',
        type: 'notice',
        category: 'Safety',
        title: 'Neighborhood Watch Meeting',
        description: 'Monthly meeting to discuss security improvements and patrol schedules.',
        authorName: 'Zanele Khumalo',
        authorRole: 'Safety Lead',
        authorImage: 'https://picsum.photos/seed/zanele/100/100',
        timestamp: '1h ago',
        isLarge: true
      }
    ],
    businesses: [
      {
        id: 'b3',
        name: 'Kwamashu Spaza',
        distance: '0.2 km',
        category: 'General Store',
        status: 'Open',
        image: 'https://picsum.photos/seed/spaza/400/400',
        neighbors: 15
      }
    ],
    chats: [
      {
        id: 'c5',
        name: 'Zanele Khumalo',
        type: 'individual',
        members: [{ name: 'Zanele Khumalo', role: 'Moderator', image: 'https://picsum.photos/seed/zanele/100/100' }],
        lastMessage: {
          id: 'm5',
          senderName: 'Zanele Khumalo',
          senderRole: 'Moderator',
          senderImage: 'https://picsum.photos/seed/zanele/100/100',
          text: 'The patrol schedule is ready for review.',
          timestamp: '8:30 AM'
        }
      }
    ]
  },
  {
    id: 'cape-town-central',
    name: 'Cape Town Central',
    owner_id: 'mock-owner-3',
    type: 'TRIAL',
    trial_end_date: '2026-05-01T00:00:00Z',
    status: 'Live',
    userRole: 'Admin',
    alerts: [],
    notices: [
      {
        id: 'n5',
        type: 'notice',
        category: 'Infrastructure',
        title: 'City Center Water Upgrade',
        description: 'Main water lines are being upgraded in the CBD. Expect low pressure.',
        authorName: 'City Admin',
        authorRole: 'Admin',
        authorImage: 'https://picsum.photos/seed/city/100/100',
        timestamp: '1h ago',
        isLarge: true
      }
    ],
    businesses: [],
    chats: []
  }
];
