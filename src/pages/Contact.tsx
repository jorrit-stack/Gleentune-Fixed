import { Mail } from 'lucide-react';
import SEO from '../components/SEO';

export default function Contact() {
  return (
    <>
      <SEO
        title="Contact Gleetune - Report a Station or Share Feedback"
        description="Get in touch with Gleetune to report issues, suggest new stations, or share feedback."
        canonicalUrl="https://gleetune.com/contact"
      />
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold text-amber-900 mb-6">Contact Gleetune</h1>

        <div className="bg-white/80 backdrop-blur rounded-lg shadow-lg p-8 space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-amber-800 mb-3">Get in Touch</h2>
            <p className="text-gray-700 leading-relaxed">
              We'd love to hear from you! Whether you've found a broken stream, want to suggest
              a new station, or just want to share feedback about Gleetune, please reach out.
            </p>
          </section>

          <section className="bg-amber-50 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-6 h-6 text-amber-800" />
              <h3 className="text-xl font-semibold text-amber-900">Email Us</h3>
            </div>
            <a
              href="mailto:contact@gleetune.com"
              className="text-lg text-amber-700 hover:text-amber-900 font-medium underline"
            >
              contact@gleetune.com
            </a>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-amber-800 mb-3">Report Issues</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Found a station that won't play or has incorrect information? Please let us know:
            </p>
            <ul className="space-y-2 text-gray-700 ml-4 list-disc list-inside">
              <li>Station name and frequency</li>
              <li>City and band you were listening from</li>
              <li>What went wrong (no audio, wrong station, etc.)</li>
              <li>Your browser and device type</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-amber-800 mb-3">Suggest Stations</h2>
            <p className="text-gray-700 leading-relaxed">
              Know a great radio station we're missing? Send us:
            </p>
            <ul className="space-y-2 text-gray-700 ml-4 list-disc list-inside mt-3">
              <li>Station name and official website</li>
              <li>Frequency and band (AM/FM/SW)</li>
              <li>City and country of broadcast</li>
              <li>Official stream URL (if available)</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              We'll verify and add it to our database if it meets our quality standards.
            </p>
          </section>

          <section className="border-t pt-6">
            <h3 className="text-lg font-semibold text-amber-800 mb-2">Privacy Note</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              When you contact us, we collect only the information you provide (name, email, message).
              We use this solely to respond to your inquiry and improve Gleetune. We never share
              your information with third parties. See our <a href="/privacy" className="text-amber-700 hover:underline">Privacy Policy</a> for details.
            </p>
          </section>
        </div>
      </div>
      </div>
    </>
  );
}
