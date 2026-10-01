import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'EduPulse - Institute & Batch Feedback Management Portal',
  description: 'Comprehensive institute management system for classes, batches, teachers, bulk student enrolment, custom rating feedback forms, and real-time response analytics.',
  openGraph: {
    title: 'EduPulse - Institute & Batch Feedback Management Portal',
    description: 'Comprehensive institute management system for classes, batches, teachers, bulk student enrolment, custom rating feedback forms, and real-time response analytics.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EduPulse - Institute & Batch Feedback Management Portal',
    description: 'Comprehensive institute management system for classes, batches, teachers, bulk student enrolment, custom rating feedback forms, and real-time response analytics.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
