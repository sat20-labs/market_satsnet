import { UTXO_DUST } from '../constants';
export var InscriptionUnit = /*#__PURE__*/ (function () {
  // satoshis of this unit

  function InscriptionUnit(satoshis, inscriptions) {
    this.satoshis = satoshis;
    this.inscriptions = inscriptions;
  }
  var _proto = InscriptionUnit.prototype;
  _proto.hasInscriptions = function hasInscriptions() {
    return this.inscriptions.length > 0;
  };
  return InscriptionUnit;
})();
export var InscriptionUnspendOutput = /*#__PURE__*/ (function () {
  function InscriptionUnspendOutput(utxo, outputValue) {
    this.utxo = utxo;
    this.split(utxo.satoshis, utxo.inscriptions, outputValue);
  }

  // split the UTXO to units
  var _proto2 = InscriptionUnspendOutput.prototype;
  _proto2.split = function split(satoshis, inscriptions, splitOutputValue) {
    if (splitOutputValue === void 0) {
      splitOutputValue = UTXO_DUST;
    }
    var inscriptionUnits = [];
    var leftAmount = satoshis;
    for (var i = 0; i < inscriptions.length; i++) {
      var id = inscriptions[i].inscriptionId;
      var offset = inscriptions[i].offset;
      var usedSatoshis = satoshis - leftAmount;
      var curOffset = offset - usedSatoshis;
      if (curOffset < 0 || leftAmount < splitOutputValue) {
        if (inscriptionUnits.length == 0) {
          inscriptionUnits.push(
            new InscriptionUnit(leftAmount, [
              {
                id: id,
                outputOffset: offset,
                unitOffset: curOffset,
              },
            ]),
          );
          leftAmount = 0;
        } else {
          // injected to previous
          var preUnit = inscriptionUnits[inscriptionUnits.length - 1];
          preUnit.inscriptions.push({
            id: id,
            outputOffset: offset,
            unitOffset: preUnit.satoshis + curOffset,
          });
          continue;
        }
      }
      if (leftAmount >= curOffset) {
        if (leftAmount > splitOutputValue * 2) {
          if (curOffset >= splitOutputValue) {
            inscriptionUnits.push(new InscriptionUnit(curOffset, []));
            inscriptionUnits.push(
              new InscriptionUnit(splitOutputValue, [
                {
                  id: id,
                  outputOffset: offset,
                  unitOffset: 0,
                },
              ]),
            );
          } else {
            inscriptionUnits.push(
              new InscriptionUnit(curOffset + splitOutputValue, [
                {
                  id: id,
                  outputOffset: offset,
                  unitOffset: curOffset,
                },
              ]),
            );
          }
        } else {
          inscriptionUnits.push(
            new InscriptionUnit(curOffset + splitOutputValue, [
              {
                id: id,
                outputOffset: offset,
                unitOffset: curOffset,
              },
            ]),
          );
        }
      }
      leftAmount -= curOffset + splitOutputValue;
    }
    if (leftAmount > UTXO_DUST) {
      inscriptionUnits.push(new InscriptionUnit(leftAmount, []));
    } else if (leftAmount > 0) {
      if (inscriptionUnits.length > 0) {
        inscriptionUnits[inscriptionUnits.length - 1].satoshis += leftAmount;
      } else {
        inscriptionUnits.push(new InscriptionUnit(leftAmount, []));
      }
    }
    this.inscriptionUnits = inscriptionUnits;
  };

  /**
   * Get non-Ord satoshis for spending
   */
  _proto2.getNonInscriptionSatoshis = function getNonInscriptionSatoshis() {
    return this.inscriptionUnits
      .filter(function (v) {
        return v.inscriptions.length == 0;
      })
      .reduce(function (pre, cur) {
        return pre + cur.satoshis;
      }, 0);
  };

  /**
   * Get last non-ord satoshis for spending.
   * Only the last one is available
   * @returns
   */
  _proto2.getLastUnitSatoshis = function getLastUnitSatoshis() {
    var last = this.inscriptionUnits[this.inscriptionUnits.length - 1];
    if (last.inscriptions.length == 0) {
      return last.satoshis;
    }
    return 0;
  };
  _proto2.hasInscriptions = function hasInscriptions() {
    return this.utxo.inscriptions.length > 0;
  };

  // print each units
  _proto2.dump = function dump() {
    this.inscriptionUnits.forEach(function (v) {
      console.log('satoshis:', v.satoshis, 'inscriptions:', v.inscriptions);
    });
  };
  return InscriptionUnspendOutput;
})();
