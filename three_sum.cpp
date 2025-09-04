#include<iostream>
#include<vector>
#include<algorithm>
#define no_ans {-1, -1, -1}

using namespace std;

int bin_search(vector<pair<int, int>>& arr, int target, int start_index) {
    int start = start_index;
    int end = arr.size() - 1;
    int mid;
    while(start < end) {
        mid = start + (end - start) / 2;
        if (target == arr[mid].first) {
            return mid;
        }
        else if (target < arr[mid].first) {
            start = mid + 1;
        }
        else {
            end = mid - 1;
        }
    }
    return -1;
}

bool comp(const pair<int, int>& a, const pair<int, int>& b) {
    return a.first < b.first;
}

vector<int> three_sum(vector<int>& arr, int target) {
    int sz = arr.size();
    vector<pair<int, int>> sorted_arr(sz);
    for (int i = 0; i < arr.size(); i++) {
        sorted_arr[i] = {arr[i], i};
    }
    sort(sorted_arr.begin(), sorted_arr.end(), comp);

    for (int i = 0; i < sz; i++) {
        for (int j = i + 1; j < sz; j++) {
            int curr_target = target - (sorted_arr[i].first + sorted_arr[j].first);
            if (curr_target <= sorted_arr[j].first) break;
            int third_index = bin_search(sorted_arr, curr_target, j + 1);
            if (third_index != -1) {
                return {sorted_arr[i].second, sorted_arr[j].second, sorted_arr[third_index].second};
            }
        }
    }
    return no_ans;
}

int main() {
    vector<int> arr = {3, 12, 43, 23, 15, 32, 11};
    int target = 67;

    vector<int> ans = three_sum(arr, target);
    if (ans[0] == -1) {
        cout << "There are no 3 numbers in given array that add up to " << target << "!\n";
    }
    cout << "Numbers at these indexes add to make " << target << ": " << ans[0] << ", " << ans[1] << ", " << ans[2] << '\n';

    return 0;
}