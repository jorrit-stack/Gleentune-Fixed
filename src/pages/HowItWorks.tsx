import SEO from '../components/SEO';

export default function HowItWorks() {
  return (
    <>
      <SEO
        title="How Gleetune Works – Realistic Radio Coverage Explained"
        description="Understand how Gleetune models AM/FM/Shortwave radio coverage using real propagation physics and verified live streams."
        canonicalUrl="https://gleetune.com/how-it-works"
      />
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold text-amber-900 mb-6">How Gleetune Works</h1>

        <div className="bg-white/80 backdrop-blur rounded-lg shadow-lg p-8 space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-amber-800 mb-3">Understanding Radio Bands</h2>

            <div className="space-y-4">
              <div className="border-l-4 border-amber-500 pl-4">
                <h3 className="font-semibold text-lg text-amber-900">AM (Medium Wave)</h3>
                <p className="text-gray-700">
                  530-1700 kHz. Local and regional stations with ranges up to 100+ km during the day,
                  extending further at night. Best for news, talk radio, and sports.
                </p>
              </div>

              <div className="border-l-4 border-orange-500 pl-4">
                <h3 className="font-semibold text-lg text-amber-900">FM</h3>
                <p className="text-gray-700">
                  87.5-108 MHz. High-quality local stations with 30-60 km range.
                  Line-of-sight propagation delivers excellent audio for music and talk.
                </p>
              </div>

              <div className="border-l-4 border-red-500 pl-4">
                <h3 className="font-semibold text-lg text-amber-900">Shortwave (SW)</h3>
                <p className="text-gray-700">
                  3-30 MHz, divided into bands. Global reach through ionospheric reflection.
                  Range and quality vary dramatically by time of day, season, and solar activity.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-amber-800 mb-3">Realistic Propagation Modeling</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Gleetune doesn't just list every station in the world. We simulate which stations
              would realistically reach your selected location:
            </p>

            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="font-semibold text-amber-800 mr-2">•</span>
                <span><strong>Day/Night Cycles:</strong> Shortwave bands perform differently depending on sunlight.
                Lower frequencies travel further at night, while higher frequencies work best during the day.</span>
              </li>
              <li className="flex items-start">
                <span className="font-semibold text-amber-800 mr-2">•</span>
                <span><strong>Geographic Distance:</strong> We calculate the distance between broadcaster and listener
                to determine if propagation is feasible for that band.</span>
              </li>
              <li className="flex items-start">
                <span className="font-semibold text-amber-800 mr-2">•</span>
                <span><strong>Regional Targeting:</strong> Shortwave broadcasters aim at specific regions.
                We match stations to listeners based on intended coverage zones.</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-amber-800 mb-3">Stream Verification & Updates</h2>
            <p className="text-gray-700 leading-relaxed">
              Not all radio streams on the internet work reliably. Gleetune maintains quality through:
            </p>

            <ul className="space-y-2 text-gray-700 mt-3 ml-4 list-disc list-inside">
              <li>Automated daily validation of all stream URLs</li>
              <li>Community reporting of broken or incorrect streams</li>
              <li>Manual verification of station metadata (frequency, location, language)</li>
              <li>Regular updates as stations change their streaming infrastructure</li>
            </ul>

            <p className="text-gray-700 leading-relaxed mt-4">
              Only verified, working streams appear in search results. If a station stops broadcasting,
              we remove it from the active catalog until it's restored.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-amber-800 mb-3">How to Use Gleetune</h2>
            <ol className="space-y-2 text-gray-700 ml-4 list-decimal list-inside">
              <li>Select your listening city from the location dropdown</li>
              <li>Choose a radio band (AM, FM, or one of the shortwave bands)</li>
              <li>Turn on the radio using the power switch</li>
              <li>Tune the dial to find stations, or select one from the list below</li>
              <li>Enjoy live radio from around the world!</li>
            </ol>
          </section>
        </div>
      </div>
      </div>
    </>
  );
}
