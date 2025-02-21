import Kmeans
import dist
import selectCenters

class Testing:

  def run(self):
    trainKmeans = Kmeans.Kmeans(training_samples = [[6, 4], [1, 1], [2, 0], [4, 5]], group_count = 2, distFunctionName = dist.distEnum.cos, initCenterSelectMethod = selectCenters.centerSelectEnum.kmeansPlusPlus)
    trainKmeans.Training()
    trainKmeans.prediction(samples = [[1, -3], [17, 6], [-2, -5], [9, 15], [7, 1], [9, 8], [3, 2], [-7, 7]])

theTesting = Testing()
theTesting.run()