import SEO from '../components/SEO';

export default function Privacy() {
  return (
    <>
      <SEO
        title="Gleetune Privacy Policy & Terms of Use"
        description="Read Gleetune's privacy policy and terms covering data, third-party streams, and fair usage."
        canonicalUrl="https://gleetune.com/privacy"
      />
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold text-amber-900 mb-6">Privacy Policy & Terms of Use</h1>

        <div className="bg-white/80 backdrop-blur rounded-lg shadow-lg p-8 space-y-8">
          <section>
            <p className="text-sm text-gray-600 mb-6">Last updated: November 3, 2025</p>

            <h2 className="text-2xl font-semibold text-amber-800 mb-3">Privacy Policy</h2>

            <div className="space-y-4 text-gray-700">
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                <p className="font-semibold text-blue-900 mb-2">Your Privacy Matters</p>
                <p className="text-sm text-blue-800">
                  Gleetune respects your privacy and complies with international data protection standards.
                  We do NOT collect personally identifiable information. All preferences are stored locally
                  in your browser. We do NOT use cookies, trackers, or analytics services.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-lg text-amber-900 mb-2">Data We Collect</h3>
                <p className="mb-2 font-semibold text-green-700">Zero Personal Data Collection</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong>No cookies</strong> - We do not use cookies or tracking technologies</li>
                  <li><strong>No analytics</strong> - We do not track pageviews or user behavior</li>
                  <li><strong>No accounts</strong> - No registration, login, or user profiles</li>
                  <li><strong>Local storage only</strong> - City selection stored in your browser only (never transmitted to our servers)</li>
                  <li><strong>No IP logging</strong> - We do not log IP addresses or location data</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg text-amber-900 mb-2">How We Use Your Data</h3>
                <p className="font-semibold text-green-700">We don't. Your data never leaves your device.</p>
                <p className="mt-2">
                  All preferences and selections are stored in your browser's local storage. We have zero visibility
                  into your listening habits, preferences, or usage patterns.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-lg text-amber-900 mb-2">Third-Party Connections</h3>
                <p className="mb-2">When you use Gleetune:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong>Radio Streams:</strong> Direct connection from your browser to broadcaster servers (we never intercept)</li>
                  <li><strong>Station Logos:</strong> Loaded directly from broadcaster websites or public CDNs</li>
                  <li><strong>Station Database:</strong> Public domain data from Radio Browser (CC0), EiBi schedules (free distribution), and GeoNames (CC-BY 4.0)</li>
                  <li><strong>IP Geolocation:</strong> Optional - ipapi.co may be used ONLY to suggest your city (request initiated by your browser, not logged by us)</li>
                </ul>
                <p className="mt-2 text-sm text-gray-600">
                  We do NOT share your data with third parties because we don't collect it in the first place.
                  The IP geolocation request is made directly from your browser to ipapi.co for location suggestion only.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-lg text-amber-900 mb-2">Your Rights</h3>
                <p className="mb-2">You have complete control over your data:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong>Access:</strong> No data to access (we don't collect any)</li>
                  <li><strong>Delete:</strong> Clear browser local storage to erase all preferences</li>
                  <li><strong>Export:</strong> Export your preferences via browser developer tools</li>
                  <li><strong>Control:</strong> No tracking to opt out of</li>
                </ul>
                <p className="mt-2 text-sm font-semibold text-green-700">
                  Because we collect zero personal data, your privacy is fully protected by design.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-lg text-amber-900 mb-2">Data Retention</h3>
                <p><strong>Zero retention period</strong> - We don't store any user data on our servers.</p>
              </div>
            </div>
          </section>

          <section className="border-t pt-8">
            <h2 className="text-2xl font-semibold text-amber-800 mb-3">Legal Disclaimer</h2>

            <div className="space-y-4 text-gray-700">
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-4">
                <p className="font-semibold text-amber-900 mb-2">What Gleetune Is</p>
                <p className="text-sm text-amber-800">
                  Gleetune is a directory service that provides links to publicly-available radio streams.
                  We do NOT host, store, or retransmit any audio content. All streams are provided directly
                  by broadcasters or public directories.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-lg text-amber-900 mb-2">Data Sources & Attribution</h3>
                <p className="mb-2">Our station database uses publicly available and properly licensed sources:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong>Radio Browser API:</strong> Public domain stream URLs and metadata</li>
                  <li><strong>EiBi Frequency Lists:</strong> Freely distributable frequency schedules</li>
                  <li><strong>GeoNames:</strong> Licensed geographical data with attribution</li>
                  <li><strong>Station Logos:</strong> Linked from official broadcaster websites (not hosted by us)</li>
                </ul>
                <p className="mt-2 text-sm text-gray-600">
                  All broadcasts remain the property of their respective owners.
                </p>
              </div>
            </div>
          </section>

          <section className="border-t pt-8">
            <h2 className="text-2xl font-semibold text-amber-800 mb-3">Terms of Use</h2>

            <div className="space-y-4 text-gray-700">

              <div>
                <h3 className="font-semibold text-lg text-amber-900 mb-2">Stream Ownership & Content</h3>
                <p className="leading-relaxed mb-2">
                  Gleetune operates as a <strong>non-hosting directory service</strong>:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>We do NOT host, store, or redistribute any audio content</li>
                  <li>We do NOT intercept, record, or modify streams</li>
                  <li>We provide ONLY links to publicly-available streams</li>
                  <li>All content remains property of respective broadcasters</li>
                  <li>Stream connections are direct from your browser to broadcaster servers</li>
                </ul>
              </div>


              <div>
                <h3 className="font-semibold text-lg text-amber-900 mb-2">International Use</h3>
                <p className="leading-relaxed">
                  Gleetune is available worldwide and uses standard web technologies.
                  This service contains no restricted technology and is freely accessible internationally.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-lg text-amber-900 mb-2">No Guarantees</h3>
                <p className="leading-relaxed">
                  Radio streams may stop working without notice. Gleetune makes no guarantee of availability,
                  audio quality, or accuracy of station information. We verify streams regularly but cannot
                  control external broadcaster infrastructure.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-lg text-amber-900 mb-2">Fair Use Policy</h3>
                <p className="leading-relaxed mb-2">
                  We use publicly available and open APIs to power parts of this service. To ensure fairness and respect for the original data sources, users agree to:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Use Gleetune only for personal or non-commercial listening only, not for automated scraping or large-scale data extraction.</li>
                  <li>Not misuse, overload, or interfere with the APIs or data sources connected to this platform.</li>
                  <li>Respect the terms of use of any third-party APIs or data providers accessed through this service.</li>
                  <li>Not attempt to exploit, reverse-engineer, or repurpose this platform for unauthorized commercial use.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-lg text-amber-900 mb-2">Copyright & DMCA</h3>
                <p className="leading-relaxed">
                  If you are a broadcaster and believe your stream or logo is being used improperly,
                  please contact us immediately at <a href="mailto:contact@gleetune.com" className="text-amber-700 hover:underline">contact@gleetune.com</a>.
                  We will promptly investigate and remove content as appropriate.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-lg text-amber-900 mb-2">Changes to These Terms</h3>
                <p className="leading-relaxed">
                  We may update this policy from time to time. Continued use of Gleetune after changes
                  constitutes acceptance of the updated terms.
                </p>
              </div>
            </div>
          </section>

          <section className="border-t pt-8">
            <h2 className="text-2xl font-semibold text-amber-800 mb-3">Contact</h2>
            <p className="text-gray-700">
              Questions about privacy or terms? Email us at{' '}
              <a href="mailto:contact@gleetune.com" className="text-amber-700 hover:underline font-medium">
                contact@gleetune.com
              </a>
            </p>
          </section>
        </div>
      </div>
      </div>
    </>
  );
}
