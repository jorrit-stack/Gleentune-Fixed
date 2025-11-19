import SEO from '../components/SEO';

export default function About() {
  return (
    <>
      <SEO
        title="About Gleetune - Global Radio Explorer"
        description="Learn about Gleetune's mission to bring shortwave and digital radio together through realistic propagation and verified global streams."
        canonicalUrl="https://gleetune.com/about"
      />
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold text-amber-900 mb-6">About Gleetune</h1>

        <div className="bg-white/80 backdrop-blur rounded-lg shadow-lg p-8 space-y-6">
          <section className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded">
            <h2 className="text-2xl font-semibold text-amber-900 mb-3">Beta Notice</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Gleetune is currently in public beta. We're actively improving stability, speed, and accuracy to deliver a smoother experience.
            </p>
            <p className="text-gray-700 leading-relaxed">
              If you spot any issues or have suggestions, we'd love to hear from you - your feedback helps us make Gleetune better for everyone.
              Please contact us at{' '}
              <a href="mailto:contact@gleetune.com" className="text-amber-700 hover:text-amber-900 underline font-medium">
                contact@gleetune.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-amber-800 mb-3">The Idea Behind Gleetune</h2>
            <p className="text-gray-700 leading-relaxed">
              Gleetune was created to revive the magic of global radio listening in the digital age.
              We combine the nostalgia of AM, FM, and shortwave broadcasting with modern streaming technology,
              allowing listeners worldwide to tune into stations as if they were using a real radio receiver.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-amber-800 mb-3">Shortwave Meets Digital</h2>
            <p className="text-gray-700 leading-relaxed">
              Unlike traditional radio apps, Gleetune models realistic radio wave propagation.
              Our shortwave coverage accounts for time of day, atmospheric conditions, and geographic distance -
              just like real radio waves bouncing off the ionosphere. When you select a city and time,
              you hear stations that would actually reach that location.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-amber-800 mb-3">Data Sources & Credits</h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              Gleetune aggregates verified radio streams from multiple sources:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Station data from Radio-Browser API and public broadcasting databases</li>
              <li>Propagation modeling based on ITU frequency allocations</li>
              <li>Stream validation through automated testing and community reports</li>
              <li>Geographic data from GeoNames and official city databases</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-3">
              We verify every stream before adding it to our catalog and regularly check for broken links.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-amber-800 mb-3">Our Mission</h2>
            <p className="text-gray-700 leading-relaxed">
              To preserve and celebrate global radio culture while making it accessible to everyone.
              Whether you're a shortwave enthusiast, a traveler missing home stations, or simply curious
              about what's broadcasting around the world - Gleetune is your window to the airwaves.
            </p>
          </section>
        </div>
      </div>
      </div>
    </>
  );
}
