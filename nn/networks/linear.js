var Tensor = require('../../tensor.js');
var ad = require('../../ad');
var Network = require('../network.js');
var assert = require('assert');


function LinearNetwork(nIn, nOut) {
	Network.call(this);
	this.name = 'linear';
	this.inSize = nIn;
	this.outSize = nOut;
	this.weights = ad.lift(new Tensor([nOut, nIn]).fillRandom());
	this.biases = ad.lift(new Tensor([nOut]).fillRandom());
	this.parameters = [this.weights, this.biases];
	this.isTraining = false;
}
LinearNetwork.prototype = Object.create(Network.prototype);

LinearNetwork.prototype.setTraining = function(flag) {
	this.isTraining = flag;
};


var mmultadd = ad.newFunction(Tensor, {
	forward: function(A, x, b) {
		A = ad.project(A);
		x = ad.project(x);
		b = ad.project(b);
		var w = x.length;
		var h = b.length;
		if (w !== A.dims[1]) {
			assert(false, 'Linear network: input size is ' + w +
				' but should be ' + A.dims[1]);
		}
		var y = b.clone();
		for (var r = 0; r < h; r++) {
			var off = r*w;
			for (var c = 0; c < w; c++) {
				y.data[r] += A.data[off + c] * x.data[c];
			}
		}
		return y;
	},
	backward: function(A, x, b) {
		var Ap = ad.project(A);
		var xp = ad.project(x);
		var bp = ad.project(b);
		var aIs = A !== Ap;
		var xIs = x !== xp;
		var bIs = b !== bp;
		var w = x.length;
		var h = b.length;
		for (var r = 0; r < h; r++) {
			var off = r*w;
			var thisdx = this.dx.data[r];
			if (bIs) {
				b.dx.data[r] += thisdx;
			}
			for (var c = 0; c < w; c++) {
				if (xIs) {
					x.dx.data[c] += Ap.data[off + c] * thisdx;
				}
				if (aIs) {
					A.dx.data[off + c] += xp.data[c] * thisdx;
				}
			}
		}
	},
	getParents: ad.naryGetParents
});


LinearNetwork.prototype.eval = function(x) {
	var A = this.isTraining ? this.weights : ad.project(this.weights);
	var b = this.isTraining ? this.biases : ad.project(this.biases);
	return mmultadd(A, x, b);
};


function linear(nIn, nOut) {
	return new LinearNetwork(nIn, nOut);
}

module.exports = {
	linear: linear
};
