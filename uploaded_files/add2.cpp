#include <bits/stdc++.h>
using namespace std;
#define ll long long
#define EL endl

int main(int argc, char* argv[])
{
  ios_base::sync_with_stdio(false);
  cin.tie(NULL);
  int sum=0;
  for (int i=1; i<argc; ++i)
  {
    sum+= atoi(argv[i]);
  }
  cout << sum << '\n';
}
