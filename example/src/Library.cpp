#define NDEBUG

#include <iostream>
#include <vector>

using namespace std;

class Vhcd
{

	public:
		Vhcd() {
		}

		void AddPoint(float x) {
			cout << "Blablabla" << endl;
		}
		
		void Dispose() {
		}
};

//Including the generated glue C++ file directly saves us having to write additional files, although
//doing so does mean that both C++ files will always be recompiled whenever either one changes
#include "glue.cpp"